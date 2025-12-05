
# train_delay_models.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score, roc_auc_score
import joblib
from datetime import datetime
import warnings
from pathlib import Path
warnings.filterwarnings('ignore')

# Ensure directories exist
MODELS_DIR = Path("backend/models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

print("Loading synthetic data...")
df = pd.read_csv("backend/app/utils/synthetic_rotation_history.csv")

print(f"Total records: {len(df):,}")
print(f"Average delay: {df['delay_minutes'].mean():.2f} minutes")
print(f"Zero delay records: {(df['delay_minutes'] == 0).sum():,} ({(df['delay_minutes'] == 0).sum()/len(df)*100:.1f}%)")

# Keep EXACTLY the same feature engineering as before
print("\nEngineering features...")

# Time features
df['hour'] = pd.to_datetime(df['scheduled_arrival']).dt.hour

# Time bucket (consistent with before)
def get_time_bucket_for_df(hour):
    if hour < 5:
        return 'early_morning'
    elif hour < 10:
        return 'morning'
    elif hour < 14:
        return 'noon'
    elif hour < 17:
        return 'afternoon'
    elif hour < 21:
        return 'evening'
    else:
        return 'night'
df['time_of_day'] = df['hour'].apply(get_time_bucket_for_df)

# Date features
df['date_dt'] = pd.to_datetime(df['date'])
df['day_of_week'] = df['date_dt'].dt.dayofweek
df['is_weekend'] = df['is_weekend'].astype(int)

# Station sequence (same as before)
station_order = {
    'Aluva': 1, 'Pulinchodu': 2, 'Companypady': 3, 'Ambattukavu': 4,
    'Muttom': 5, 'Kalamassery Town': 6, 'Cochin University': 7,
    'Pathadipalam': 8, 'Edappally': 9, 'Changampuzha Park': 10,
    'Palarivattom': 11, 'JLN Stadium': 12, 'Kaloor': 13,
    'Town Hall': 14, 'M.G Road': 15, "Maharaja's College": 16,
    'Ernakulam South': 17, 'Kadavanthra': 18, 'Elamkulam': 19,
    'Vytilla': 20, 'Thaikoodam': 21, 'Vadakkekotta': 22, 'Pettah' : 23,
    'SN Junction': 24, 'Tripunithura Terminal': 25
}
df['station_sequence'] = df['station'].map(station_order).fillna(0)

# Station type (same as before)
station_types_map = {
    'Aluva': 'terminal', 'Pettah': 'terminal', 'Tripunithura Terminal': 'terminal',
    'Edappally': 'major_interchange', 'Vytilla': 'major_interchange', 'M.G Road': 'major',
    'Kalamassery Town': 'residential', 'Palarivattom': 'residential', 'JLN Stadium': 'commercial',
    'Kaloor': 'commercial', 'Town Hall': 'commercial',
    "Maharaja's College": 'education', 'Ernakulam South': 'major',
    'Kadavanthra': 'residential', 'Elamkulam': 'residential', 'Thaikoodam': 'residential',
    'Vadakkekotta': 'residential', 'SN Junction': 'residential',
    'Pulinchodu': 'local', 'Companypady': 'local', 'Ambattukavu': 'local', 'Muttom': 'local',
    'Cochin University': 'education', 'Pathadipalam': 'local', 'Changampuzha Park': 'local'
}
df['station_type'] = df['station'].map(station_types_map).fillna('other')

# Job card analysis (same as before)
DELAY_KEYWORDS = [
    "brake", "door", "traction", "signalling", "signal", "fault", "engine", "wheel",
    "axle", "coupler", "bogie", "bearing", "pantograph", "compressor", "pneumatic",
    "air leak", "leak", "vibration", "overheat", "overheating", "wheel flat", "tcms",
    "controller", "converter", "battery", "hv cable", "sensor", "speed sensor"
]

def analyze_jobcards_new(jobcard_str):
    if pd.isna(jobcard_str) or jobcard_str in ["None", "", "nan"]:
        return {'critical': 0, 'high': 0, 'medium': 0}
    
    cards = str(jobcard_str).split(';')
    critical = high = medium = 0
    
    for card_info in cards:
        if '|' in card_info:
            desc, criticality = card_info.split('|')
        else:
            desc = card_info
            criticality = 'low'
        
        if any(keyword in desc.lower() for keyword in DELAY_KEYWORDS):
            if criticality == 'critical':
                critical += 1
            elif criticality == 'high':
                high += 1
            elif criticality == 'medium':
                medium += 1
    
    return {'critical': critical, 'high': high, 'medium': medium}

jobcard_features = df['job_cards'].apply(analyze_jobcards_new)
df['critical_delay_jobcards'] = jobcard_features.apply(lambda x: x['critical'])
df['high_delay_jobcards'] = jobcard_features.apply(lambda x: x['high'])
df['medium_delay_jobcards'] = jobcard_features.apply(lambda x: x['medium'])

# Weather severity (same as before)
weather_severity_map = {
    'clear': 0,
    'hot_sunny': 0.5,
    'foggy': 1,
    'rain': 1.5,
    'storm': 3,
}
df['weather_severity'] = df['weather'].map(weather_severity_map).fillna(0)

# Cumulative delay
df['prev_cum_delay'] = df['prev_cum_delay'].fillna(0)

# Encode categorical features (same as before)
print("Encoding categorical features...")

# Station type encoder
le_station = LabelEncoder()
df['station_type_encoded'] = le_station.fit_transform(df['station_type'].astype(str))
joblib.dump(le_station, MODELS_DIR / 'station_type_encoder.pkl')
print(f"Station type classes: {le_station.classes_.tolist()}")

# Time of day encoder  
le_time = LabelEncoder()
df['time_of_day_encoded'] = le_time.fit_transform(df['time_of_day'].astype(str))
joblib.dump(le_time, MODELS_DIR / 'time_of_day_encoder.pkl')
print(f"Time of day classes: {le_time.classes_.tolist()}")

# Weather type encoder
le_weather = LabelEncoder()
df['weather_type_encoded'] = le_weather.fit_transform(df['weather'].astype(str))
joblib.dump(le_weather, MODELS_DIR / 'weather_type_encoder.pkl')
print(f"Weather type classes: {le_weather.classes_.tolist()}")

# Feature columns (SAME AS YOUR ORIGINAL!)
feature_columns = [
    'hour', 'day_of_week', 'is_weekend',
    'station_sequence',
    'critical_delay_jobcards', 'high_delay_jobcards', 'medium_delay_jobcards',
    'weather_severity', 'prev_cum_delay', 'crowd_level',
    'rotation',
    'station_type_encoded', 'time_of_day_encoded', 'weather_type_encoded'
]

print(f"\nUsing {len(feature_columns)} features:")
print(feature_columns)

# Prepare data
X = df[feature_columns]
y_reg = df['delay_minutes']  # For regression
y_clf = (df['delay_minutes'] > 2.0).astype(int)  # For classification

# Handle missing values
X = X.fillna(0)

# Train-test split
X_train, X_test, y_train_reg, y_test_reg, y_train_clf, y_test_clf = train_test_split(
    X, y_reg, y_clf, test_size=0.2, random_state=42, stratify=y_clf
)

print(f"\nTraining samples: {X_train.shape[0]:,}")
print(f"Testing samples: {X_test.shape[0]:,}")
print(f"Delay rate (>2min) in training: {y_train_clf.mean():.2%}")
print(f"Delay rate (>2min) in testing: {y_test_clf.mean():.2%}")

# Train Gradient Boosting Regressor (simple and effective)
print("\n" + "="*50)
print("Training Gradient Boosting Regressor...")
print("="*50)

gb_reg = GradientBoostingRegressor(
    n_estimators=100,
    learning_rate=0.05,
    max_depth=5,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42,
    subsample=0.8
)

gb_reg.fit(X_train, y_train_reg)
gb_pred = gb_reg.predict(X_test)

gb_mae = mean_absolute_error(y_test_reg, gb_pred)
gb_r2 = r2_score(y_test_reg, gb_pred)

print(f"✓ Model trained successfully!")
print(f"✓ Mean Absolute Error: {gb_mae:.3f} minutes")
print(f"✓ R² Score: {gb_r2:.3f}")
print(f"✓ Average prediction: {gb_pred.mean():.2f} minutes")
print(f"✓ Average actual: {y_test_reg.mean():.2f} minutes")

# Train Classifier
print("\n" + "="*50)
print("Training Delay Classifier...")
print("="*50)

clf_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=8,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1,
    class_weight='balanced'
)

clf_model.fit(X_train, y_train_clf)
clf_pred = clf_model.predict(X_test)
clf_proba = clf_model.predict_proba(X_test)[:, 1]

clf_accuracy = accuracy_score(y_test_clf, clf_pred)
clf_auc = roc_auc_score(y_test_clf, clf_proba)

print(f"✓ Classifier trained successfully!")
print(f"✓ Accuracy: {clf_accuracy:.3f}")
print(f"✓ AUC: {clf_auc:.3f}")

# Save models
print("\n" + "="*50)
print("Saving models...")
print("="*50)

joblib.dump(gb_reg, MODELS_DIR / 'gb_regressor.pkl')
joblib.dump(clf_model, MODELS_DIR / 'delay_classifier.pkl')
joblib.dump(feature_columns, MODELS_DIR / 'feature_columns.pkl')

print(f"✓ Models saved to {MODELS_DIR}/")

# Feature importance
print("\n" + "="*50)
print("Feature Importance")
print("="*50)

importance_df = pd.DataFrame({
    'feature': feature_columns,
    'importance': gb_reg.feature_importances_
}).sort_values('importance', ascending=False)

print(importance_df.head(10).to_string(index=False))

# Predict some examples
print("\n" + "="*50)
print("Sample Predictions")
print("="*50)

sample_indices = np.random.choice(len(X_test), 5, replace=False)
for idx in sample_indices:
    actual = y_test_reg.iloc[idx]
    predicted = gb_pred[idx]
    error = abs(actual - predicted)
    
    print(f"Actual: {actual:.1f} min | Predicted: {predicted:.1f} min | Error: {error:.1f} min")