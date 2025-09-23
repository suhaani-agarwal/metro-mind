import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, mean_absolute_error
import joblib
import re

# Load data
df = pd.read_csv("synthetic_rotation_history.csv")

# Feature engineering
station_map = {s: i for i, s in enumerate(df["station"].unique())}
weather_map = {w: i for i, w in enumerate(df["weather"].unique())}
time_map = {t: i for i, t in enumerate(df["time_bucket"].unique())}

def is_delay_relevant(job_cards):
    if pd.isna(job_cards):
        return 0
    delay_kw = ["brake", "door", "traction", "signalling", "fault", "engine", "wheel", "axle", "coupler"]
    for jc in str(job_cards).split(";"):
        for k in delay_kw:
            if k in jc.lower():
                return 1
    return 0

df["station_enc"] = df["station"].map(station_map)
df["weather_enc"] = df["weather"].map(weather_map)
df["time_enc"] = df["time_bucket"].map(time_map)
df["delay_jobcard"] = df["job_cards"].apply(is_delay_relevant)

features = ["station_enc", "weather_enc", "time_enc", "delay_jobcard"]
X = df[features]
y_cls = df["delay_risk"]
y_reg = df["delay_minutes"]

# Classifier
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X, y_cls)
print("Classifier CV:", cross_val_score(clf, X, y_cls, cv=5).mean())

# Regressor (only on delayed rows)
delayed = df[df["delay_risk"] == 1]
X_reg = delayed[features]
y_reg2 = delayed["delay_minutes"]
reg = RandomForestRegressor(n_estimators=100, random_state=42)
reg.fit(X_reg, y_reg2)
print("Regressor MAE:", mean_absolute_error(y_reg2, reg.predict(X_reg)))

# Export models
joblib.dump(clf, "delay_classifier.pkl")
joblib.dump(reg, "delay_regressor.pkl")
print("Models exported.")
