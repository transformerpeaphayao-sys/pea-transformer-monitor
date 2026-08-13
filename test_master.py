import pandas as pd
from core import init_connection
import gspread

def main():
    client = init_connection()
    try:
        sheet = client.open('PEA_Transformer_DB').worksheet("MasterData")
        data = sheet.get_all_values()
        print("Master Data Rows:", len(data))
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
