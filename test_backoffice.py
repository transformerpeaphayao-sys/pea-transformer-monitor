import pandas as pd
from core import init_connection, load_completed_data, load_master_data, calculate_transformer_status

def main():
    client = init_connection()
    df_record = load_completed_data(client, 'วัดโหลดหม้อแปลง ตามแผนงาน')
    df_master = load_master_data(client, 'วัดโหลดหม้อแปลง ตามแผนงาน')
    
    pea_no = '77-7777'
    
    print("--- calculate_transformer_status Output ---")
    pct_load, pct_unb = calculate_transformer_status(df_master, df_record, pea_no)
    print(f"% Load: {pct_load}")
    print(f"% Unbalance: {pct_unb}")

if __name__ == '__main__':
    main()
