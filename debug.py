import sys
import pandas as pd
from core import init_connection, load_completed_data

def run():
    client = init_connection()
    df_record = load_completed_data.__wrapped__(client, "วัดโหลดหม้อแปลง ตามแผนงาน")
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write(f"df_record.empty: {df_record.empty}\n")
        f.write(f"df_record.columns: {list(df_record.columns)}\n")
        f.write(f"df_record shape: {df_record.shape}\n")
        if not df_record.empty:
            f.write("First 5 rows of PEA NO column:\n")
            if "PEA NO" in df_record.columns:
                f.write(str(df_record["PEA NO"].head(5)))
            else:
                f.write("PEA NO column not found!\n")

if __name__ == "__main__":
    run()
