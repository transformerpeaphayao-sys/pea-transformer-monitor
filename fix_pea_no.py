import re
import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add col_pea_record definition after df_record is loaded
    if 'col_pea_record =' not in content:
        # Find where df_record is loaded
        load_pattern = r"(df_record\s*=\s*load_completed_data[^\\n]*\n)"
        replacement = r"\1            col_pea_record = \"PEA NO\" if \"PEA NO\" in df_record.columns else df_record.columns[2] if len(df_record.columns) > 2 else \"PEA NO\"\n"
        content = re.sub(load_pattern, replacement, content, count=1)
    
    # Replace hardcoded 'PEA NO' for Record Data dataframes
    dfs = ['df_record', 'df_today', 'filtered_df', 'temp_rec', 'hist_df', 'old_df']
    for df_name in dfs:
        # Match df_name['PEA NO'] or df_name["PEA NO"]
        pattern = rf"{df_name}\[['\"]PEA NO['\"]\]"
        content = re.sub(pattern, f"{df_name}[col_pea_record]", content)
        
        # Match 'PEA NO' in df_name.columns
        pattern2 = rf"['\"]PEA NO['\"]\s+in\s+{df_name}\.columns"
        content = re.sub(pattern2, f"col_pea_record in {df_name}.columns", content)
    
    # Fix row.get('PEA NO')
    content = content.replace("row.get('PEA NO', '')", "row.get(col_pea_record, '')")
    content = content.replace("row.get('PEA NO', '-')", "row.get(col_pea_record, '-')")
    content = content.replace("r.get('PEA NO', '')", "r.get(col_pea_record, '')")

    # Fix row['PEA NO']
    content = content.replace("row['PEA NO']", "row.get(col_pea_record, '')")

    # For df_task we can also replace it with col_pea_task if we want, but user only asked for df_record.
    # We will leave df_task alone for now.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('app_backoffice.py')
fix_file('app_field.py')
print("Done")
