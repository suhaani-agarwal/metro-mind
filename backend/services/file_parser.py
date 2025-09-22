import pandas as pd

def parse_uploaded_files(file_paths: dict) -> dict:
    preview = {}

    # Helper to clean NaN → None
    def clean_df(df):
        return df.where(pd.notnull(df), None).to_dict(orient="records")


     # XLSX Files
    fitness_df = pd.read_excel(file_paths["fitness"])
    preview["fitness_sample"] = clean_df(fitness_df)

    branding_df = pd.read_excel(file_paths["branding"])
    preview["branding_sample"] = clean_df(branding_df)

    stabling_df = pd.read_excel(file_paths["stabling"])
    preview["stabling_sample"] = clean_df(stabling_df)

    # CSV Files
    jobcards_df = pd.read_csv(file_paths["jobcards"])
    preview["jobcards_sample"] = clean_df(jobcards_df)

    mileage_df = pd.read_csv(file_paths["mileage"])
    preview["mileage_sample"] = clean_df(mileage_df)

    cleaning_df = pd.read_csv(file_paths["cleaning"])
    preview["cleaning_sample"] = clean_df(cleaning_df)

    return preview