import streamlit as st
from core import init_connection

def main():
    client = init_connection()
    sheet = client.open('วัดโหลดหม้อแปลง ตามแผนงาน').worksheet('Record Data')
    
    # Get all values
    all_vals = sheet.get_all_values()
    print(f"Total rows (including header): {len(all_vals)}")
    print(f"Headers: {all_vals[0]}")
    
    if len(all_vals) > 1:
        # Find rows with PEA NO = 99-9999 (test data)
        rows_to_delete = []
        for i, row in enumerate(all_vals):
            if i == 0:  # skip header
                continue
            print(f"Row {i+1}: {row[:10]}")
            # Check if this is the corrupted test data
            if '99-9999' in str(row):
                rows_to_delete.append(i + 1)  # 1-indexed for gspread
        
        print(f"\nRows to delete (99-9999 test data): {rows_to_delete}")
        
        # Delete in reverse order
        for row_idx in reversed(rows_to_delete):
            print(f"Deleting row {row_idx}...")
            sheet.delete_rows(row_idx)
        
        print(f"Deleted {len(rows_to_delete)} corrupted rows.")
    else:
        print("No data rows found.")

if __name__ == '__main__':
    main()
