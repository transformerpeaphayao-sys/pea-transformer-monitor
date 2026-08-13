import streamlit as st
from core import init_connection
import pandas as pd

def main():
    client = init_connection()
    sheet = client.open('วัดโหลดหม้อแปลง ตามแผนงาน').worksheet('Record Data')
    data = sheet.get_all_records()
    df = pd.DataFrame(data)
    print("LIVE COLUMNS:", df.columns.tolist())
    print("LIVE ROWS:", len(df))
    if len(df) > 0:
        print("FIRST PEA NO:", df.iloc[0].get("PEA NO"))

if __name__ == '__main__':
    main()
