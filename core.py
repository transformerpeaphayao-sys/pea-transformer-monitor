import streamlit as st
import gspread
import pandas as pd
import math
import datetime
from google.oauth2.service_account import Credentials
import folium
from folium.plugins import MarkerCluster, LocateControl
from streamlit_folium import st_folium
import time
import random
import io
import base64
import requests
from PIL import Image
import bcrypt
import pytz

# --- CUSTOM CSS ---
def load_custom_css():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap');
    
        /* ===== 1. CSS Variables (PEA Enterprise Theme) ===== */
    :root {
        --app-bg: #f5f7fa;         
        --card-bg: #ffffff;        
        --primary-pea: #6d1852;    /* สีม่วง PEA ตามแบรนด์ */
        --primary-light: #f5ebf6;
        --pea-gold: #c7940a;       /* สีทอง PEA */
        --danger-red: #e74c3c;
        
        --text-dark: #333333;      
        --text-gray: #7f8c8d;      
        
        --border-soft: #e0e0e0;    
        --shadow-soft: 0px 4px 12px rgba(0, 0, 0, 0.05); 
        
        /* Status Colors */
        --badge-red-bg: #fff0f0; --badge-red-text: #e11d48;
        --badge-yellow-bg: #fff8eb; --badge-yellow-text: #d97706;
        --badge-green-bg: #ebfef4; --badge-green-text: #059669;
    }

    /* ===== Global ===== */
    html, body, [class*="css"] {
        font-family: 'Prompt', 'Inter', sans-serif !important;
        background-color: var(--app-bg) !important; 
        color: var(--text-dark) !important;
    }
    
    #MainMenu {visibility: hidden;} footer {visibility: hidden;}
    .block-container { padding-top: 2.5rem !important; padding-bottom: 2rem !important; max-width: 96% !important; }
    
    /* ===== App Header (Top Banner) ===== */
    .app-header {
        background: linear-gradient(90deg, var(--primary-pea) 0%, #8a1f68 100%); /* ไล่ระดับสีม่วง PEA */
        padding: 1.2rem 2rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        display: flex;
        align-items: center;
        border-bottom: 4px solid var(--pea-gold); /* แทรกสีทองให้ดูพรีเมียม */
    }
    .app-header .title {
        font-size: 1.4rem;
        font-weight: 700;
        color: white;
        margin: 0;
        letter-spacing: 0.5px;
    }
    .app-header .subtitle {
        font-size: 0.85rem;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.85);
        margin: 0;
        margin-top: 4px;
    }
    
    /* ===== Sidebar ===== */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, var(--primary-pea) 0%, #4a1038 100%) !important;
        border-right: none !important;
        box-shadow: 4px 0px 15px rgba(0,0,0,0.15) !important;
        border-radius: 0 20px 20px 0 !important; /* ขอบโค้งด้านขวา */
        min-width: 280px !important; /* ลดความกว้างลง */
        max-width: 280px !important;
    }
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h1,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h2,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3 {
        color: #ffffff !important;
    }
    
    /* ===== Sidebar Buttons (3D Effect) ===== */
    [data-testid="stSidebar"] button[kind="secondary"],
    [data-testid="stSidebar"] button[kind="primary"] {
        background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%) !important; /* มิติแสงเงา */
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        padding: 0.8rem 1rem !important;
        border-radius: 10px !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1) !important; /* เงาตกกระทบและแสงสะท้อนขอบบน */
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3) !important; /* ตัวหนังสือมีมิติ */
        margin-bottom: 0.4rem;
    }
    [data-testid="stSidebar"] button:hover {
        background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%) !important;
        color: var(--pea-gold) !important; /* ใช้สีทองตอน Hover */
        transform: translateY(-2px) !important; /* ลอยขึ้นตอนชี้ */
        box-shadow: 0 6px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2) !important;
        border-color: var(--pea-gold) !important;
    }
    [data-testid="stSidebar"] button:active {
        transform: translateY(1px) !important; /* ยุบลงตอนกด */
        box-shadow: 0 2px 3px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.1) !important;
    }
    [data-testid="stSidebar"] hr { border-color: rgba(255,255,255,0.15); }

    /* ===== Metric Cards (ถอดแบบจากรูปภาพ) ===== */
    .metric-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .metric-card {
        flex: 1 1 180px;
        background: #ffffff;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        display: flex;
        flex-direction: column;
        justify-content: center;
        border: 1px solid #f1f5f9;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }
    .metric-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    .metric-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: transparent;
    }
    .metric-card.metric-total::before { background: linear-gradient(90deg, #818cf8, #6366f1); }
    .metric-card.metric-done::before { background: linear-gradient(90deg, #34d399, #10b981); }
    .metric-card.metric-today::before { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
    .metric-card.metric-pending::before { background: linear-gradient(90deg, #f87171, #ef4444); }
    
    .metric-card.bg-normal::before { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
    .metric-card.bg-unb::before { background: linear-gradient(90deg, #fb923c, #f97316); }
    .metric-card.bg-ovl::before { background: linear-gradient(90deg, #f87171, #ef4444); }

    .metric-card .label { 
        font-size: 0.85rem; 
        font-weight: 600; 
        color: #64748b; 
        text-transform: uppercase; 
        letter-spacing: 0.5px;    
        margin-top: 8px;
        margin-bottom: 0;
    }
    .metric-card .value { 
        font-size: 2.2rem; 
        font-weight: 800; 
        color: #1e293b; 
        line-height: 1; 
        margin-bottom: 0;
    }
    .metric-card .metric-icon {
        font-size: 1.5rem;
        opacity: 0.9;
    }
    
        /* ===== Buttons ===== */
    button[kind="primary"] {
        background: var(--primary-pea) !important; 
        color: white !important;
        border-radius: 4px !important;
        font-weight: 500 !important;
        padding: 0.5rem 1.5rem !important;
        border: none !important;
        box-shadow: 0px 2px 4px rgba(0,0,0,0.1) !important;
    }
    button[kind="primary"]:hover { background: #681d6a !important; }
    
    .btn-danger {
        background: var(--danger-red) !important;
        color: white !important;
    }
    
    /* ===== Card Header (Purple Bar) ===== */
    .pea-card-header {
        background: linear-gradient(90deg, var(--primary-pea) 0%, #8a1f68 100%); /* ไล่ระดับสีม่วง PEA */
        color: white;
        padding: 12px 18px;
        font-weight: 500;
        border-radius: 8px; /* ขอบโค้งมนทุกด้าน */
        margin-bottom: 1.5rem; /* ระยะห่างด้านล่าง */
        font-size: 1.05rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        border-left: 5px solid var(--pea-gold); /* ขอบสีทองเน้นย้ำความสำคัญ */
    }
    
    /* ===== Tabs ===== */
    .stTabs [data-baseweb="tab-list"] { border-bottom: 1px solid #e2e8f0; gap: 20px; }
    .stTabs [data-baseweb="tab"] {
        color: var(--text-gray) !important;
        font-weight: 600 !important;
        padding: 10px 5px !important;
        background: transparent !important;
        border: none !important;
    }
    .stTabs [aria-selected="true"] {
        color: var(--pea-gold) !important;
        border-bottom: 3px solid var(--pea-gold) !important;
    }

    /* ===== 🌟 Ultimate Clean Table (เหมือนรูป 100%) ===== */
    .pea-table-wrapper {
        background-color: var(--card-bg);
        border-radius: 16px; /* ขอบมนกว้างขึ้น */
        box-shadow: var(--shadow-soft);
        padding: 1rem 1.5rem; /* เว้นขอบด้านใน */
        overflow-x: auto;
        margin-bottom: 1.5rem;
    }
    .pea-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 100%;
    }
    /* หัวตารางพื้นหลังสีเข้ม (Dark Header) */
    .pea-table th {
        background-color: var(--primary-pea) !important; /* สีม่วงเข้ม PEA */
        color: white !important;
        padding: 18px 12px !important;
        font-size: 0.85rem !important;
        font-weight: 500 !important;
        text-transform: uppercase !important; /* ตัวพิมพ์ใหญ่ทั้งหมด เพื่อความเนี๊ยบ */
        letter-spacing: 0.5px !important;
        border-bottom: 2px solid #e2e8f0 !important;
        white-space: nowrap !important;
        text-align: center !important;
        font-family: 'Prompt', 'Inter', sans-serif !important; /* บังคับใช้ฟอนต์เดียวกัน */
    }
    /* คอลัมน์ข้อมูล */
    .pea-table td {
        padding: 16px 10px !important;
        border-bottom: 1px dashed #e2e8f0 !important; /* เส้นคั่นแบบประจางๆ */
        color: var(--text-dark) !important;
        font-size: 0.9rem !important;
        vertical-align: middle !important;
        text-align: left !important;
        font-family: 'Prompt', 'Inter', sans-serif !important; /* บังคับใช้ฟอนต์เดียวกัน */
    }
    .pea-table tr:last-child td { border-bottom: none !important; }
    
    /* สลับสีพื้นหลังกลุ่มหม้อแปลง */
    .pea-table tr.group-odd td { 
        background-color: #f8fafc !important; /* ฟ้าเทาอ่อนมาก */
    }
    .pea-table tr.group-even td { 
        background-color: #fff7ed !important; /* ส้มอ่อนมาก */
    }
    .pea-table td.grouped-cell {
        border-right: 1px solid #e2e8f0 !important;
    }
    
    /* Alignment Classes */
    .pea-table th.num-cell, .pea-table td.num-cell {
        text-align: right !important;
        padding-right: 20px !important;
    }
    /* Field App Transformer Info Banner */
    .tr-info-banner {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        background: linear-gradient(to right, #ffffff, #f8fafc);
        border: 1px solid #e2e8f0;
        border-left: 5px solid var(--pea-gold);
        padding: 12px 20px;
        border-radius: 8px;
        margin: 5px 0 15px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .tr-info-item {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 120px;
    }
    .tr-info-item .lbl {
        font-size: 0.75rem;
        color: #64748b;
        font-weight: 600;
        margin-bottom: 2px;
    }
    .tr-info-item .val {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--primary-pea);
    }
    /* Feeder Card Title */
    .feeder-card-title {
        background: linear-gradient(90deg, #f8fafc, #ffffff);
        border: 1px solid #e2e8f0;
        border-left: 5px solid #ef4444; /* PEA Red / Accent */
        padding: 10px 15px;
        border-radius: 6px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 15px;
        font-size: 1.05rem;
        box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    </style>
    """, unsafe_allow_html=True)

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def get_users_df(client, spreadsheet_name="PEA_Transformer_DB"):
    try:
        sheet = client.open(spreadsheet_name).worksheet("Users")
        data = sheet.get_all_records()
        return pd.DataFrame(data)
    except Exception as e:
        return pd.DataFrame()

def authenticate_user(client, spreadsheet_name, username, password):
    df_users = get_users_df(client, spreadsheet_name)
    if df_users.empty:
        return False, None, None
    
    user_row = df_users[df_users['Username'].astype(str) == username]
    if user_row.empty:
        return False, None, None
    
    hashed = str(user_row.iloc[0].get('Password_Hash', ''))
    if verify_password(password, hashed):
        name = user_row.iloc[0].get('Name', '')
        emp_id = user_row.iloc[0].get('Emp_ID', '')
        return True, name, emp_id
    
    return False, None, None

def register_user(client, spreadsheet_name, username, password, name, emp_id):
    df_users = get_users_df(client, spreadsheet_name)
    if not df_users.empty and username in df_users['Username'].astype(str).values:
        return False, "Username นี้มีผู้ใช้งานแล้ว"
    
    try:
        sheet = client.open(spreadsheet_name).worksheet("Users")
        hashed_pw = hash_password(password)
        sheet.append_row([username, hashed_pw, name, emp_id])
        return True, "ลงทะเบียนสำเร็จ!"
    except Exception as e:
        return False, f"เกิดข้อผิดพลาด: {e}"


# --- Helper Functions ---
def check_bitcoin_miner(ia, ib, ic, in_measured):
    ia = safe_float(ia)
    ib = safe_float(ib)
    ic = safe_float(ic)
    in_measured = safe_float(in_measured)
    
    sqrt3_over_2 = math.sqrt(3) / 2
    real_part = ia - (0.5 * ib) - (0.5 * ic)
    imag_part = (sqrt3_over_2 * ic) - (sqrt3_over_2 * ib)
    
    in_cal = math.sqrt((real_part ** 2) + (imag_part ** 2))
    
    harmonic_current = in_measured - in_cal
    
    is_suspicious = False
    if harmonic_current > 15.0 and in_measured > (in_cal * 1.30):
        is_suspicious = True
        
    return is_suspicious, harmonic_current, in_cal

def safe_float(val, default=0.0):
    import re
    try:
        if pd.isna(val) or val == "":
            return default
        if isinstance(val, str):
            val = val.replace(',', '').strip()
            match = re.search(r'[-+]?\d*\.?\d+', val)
            if match:
                val = match.group()
            else:
                return default
        return float(val)
    except (ValueError, TypeError):
        return default

@st.cache_data
def convert_df_to_csv(df):
    return df.to_csv(index=False).encode('utf-8-sig')


# --- Google API Connection ---
@st.cache_resource
def get_google_credentials():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    try:
        creds_dict = dict(st.secrets["gcp_service_account"])
        credentials = Credentials.from_service_account_info(creds_dict, scopes=scopes)
        return credentials
    except Exception:
        pass
    
    try:
        credentials = Credentials.from_service_account_file("credentials.json", scopes=scopes)
        return credentials
    except FileNotFoundError:
        st.error("ไม่พบข้อมูลการเชื่อมต่อ กรุณานำไฟล์ 'credentials.json' มาวาง หรือตั้งค่าใน Streamlit Secrets")
        return None
    except Exception as e:
        st.error(f"เกิดข้อผิดพลาดในการโหลด Credentials: {e}")
        return None

@st.cache_resource
def init_connection():
    credentials = get_google_credentials()
    if credentials:
        try:
            client = gspread.authorize(credentials)
            return client
        except Exception as e:
            st.error(f"เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets: {e}")
            return None
    return None

def compress_image(img_bytes, max_width=1024, quality=75):
    try:
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        output_io = io.BytesIO()
        img.save(output_io, format="JPEG", quality=quality)
        return output_io.getvalue()
    except Exception as e:
        return img_bytes

def upload_image_to_drive(file_bytes, folder_id, file_name):
    web_app_url = st.secrets.get("gas_web_app_url", "")
    
    if not web_app_url:
        st.error("ไม่พบ 'gas_web_app_url' ใน Streamlit Secrets")
        return None
    
    try:
        encoded_image = base64.b64encode(file_bytes).decode('utf-8')
        payload = {
            "fileName": file_name,
            "mimeType": "image/jpeg",
            "fileData": encoded_image,
            "folderId": folder_id
        }
        
        response = requests.post(web_app_url, json=payload, timeout=20)
        
        if response.status_code == 200:
            response_text = str(response.text).strip()
            if not response_text.startswith("Error"):
                return response_text 
            else:
                st.error(f"Apps Script Error: {response_text}")
                return None
        else:
            st.error(f"HTTP Error: {response.status_code}")
            return None
    except Exception as e:
        st.error(f"Upload Image Exception: {e}")
        return None


# --- Master Data & Data Logic ---
@st.cache_data(ttl=600)
def load_master_data(_client, spreadsheet_name="PEA_Transformer_DB"):
    try:
        sheet = _client.open(spreadsheet_name).worksheet("MasterData")
        data = sheet.get_all_values()
        if len(data) > 0:
            headers = data[0]
            df = pd.DataFrame(data[1:], columns=headers)
        else:
            df = pd.DataFrame()
        if 'LATITUDE' in df.columns and 'LONGITUDE' in df.columns:
            df['LATITUDE'] = pd.to_numeric(df['LATITUDE'], errors='coerce')
            df['LONGITUDE'] = pd.to_numeric(df['LONGITUDE'], errors='coerce')
        return df
    except gspread.exceptions.SpreadsheetNotFound:
        st.error(f"ไม่พบไฟล์ Google Sheet ที่ชื่อ '{spreadsheet_name}'")
        return pd.DataFrame()
    except Exception as e:
        st.error(f"ไม่สามารถโหลดข้อมูล MasterData ได้: {e}")
        return pd.DataFrame()

def add_master_data_to_sheet(client, spreadsheet_name, row_data):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            sheet = client.open(spreadsheet_name).worksheet("MasterData")
            sheet.append_row(row_data)
            load_master_data.clear()
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(random.uniform(1.5, 3.0)) 
            else:
                st.error(f"Error adding master data: {e}")
                return False

def update_master_data_in_sheet(client, spreadsheet_name, pea_no, updated_data_dict):
    try:
        sh = client.open(spreadsheet_name)
        pea_str = str(pea_no).strip()
        sheet_master = sh.worksheet("MasterData")
        records = sheet_master.get_all_records()
        headers = sheet_master.row_values(1)
        
        row_idx_to_update = None
        for idx, row in enumerate(records):
            if str(row.get('PEANO หม้อแปลง', '')).strip() == pea_str:
                row_idx_to_update = idx + 2
                break
                
        if row_idx_to_update:
            cells_to_update = []
            for col_name, new_val in updated_data_dict.items():
                if col_name in headers:
                    col_idx = headers.index(col_name) + 1
                    cells_to_update.append(
                        gspread.Cell(row=row_idx_to_update, col=col_idx, value=new_val)
                    )
            if cells_to_update:
                sheet_master.update_cells(cells_to_update)
                load_master_data.clear()
                return True
        return False
    except Exception as e:
        st.error(f"Error updating master data: {e}")
        return False

def delete_transformer_from_all_sheets(client, spreadsheet_name, pea_no):
    try:
        sh = client.open(spreadsheet_name)
        pea_str = str(pea_no).strip()
        
        try:
            sheet_master = sh.worksheet("MasterData")
            records = sheet_master.get_all_records()
            for idx, row in enumerate(records):
                if str(row.get('PEANO หม้อแปลง', '')).strip() == pea_str:
                    sheet_master.delete_row(idx + 2)
                    break
        except Exception as e:
            st.warning(f"ลบ MasterData: {e}")

        # ฟังก์ชันช่วยลบหลายบรรทัดพร้อมกันใน 1 API Call (เร็วมาก และไม่ติด Limit)
        def batch_delete_rows(worksheet, rows_to_delete):
            if not rows_to_delete: return
            requests = []
            for row_idx in sorted(rows_to_delete, reverse=True):
                requests.append({
                    "deleteDimension": {
                        "range": {
                            "sheetId": worksheet.id,
                            "dimension": "ROWS",
                            "startIndex": row_idx - 1,
                            "endIndex": row_idx
                        }
                    }
                })
            if requests:
                sh.batch_update({"requests": requests})

        try:
            sheet_record = sh.worksheet("Record Data")
            records = sheet_record.get_all_records()
            rows_to_delete = []
            for idx, row in enumerate(records):
                if str(row.get('PEA NO', '')).strip() == pea_str:
                    rows_to_delete.append(idx + 2)
            batch_delete_rows(sheet_record, rows_to_delete)
        except Exception as e:
            st.warning(f"ลบ Record Data: {e}")
            
        try:
            sheet_task = sh.worksheet("Task Data")
            records = sheet_task.get_all_records()
            rows_to_delete = []
            for idx, row in enumerate(records):
                if str(row.get('PEA NO', '')).strip() == pea_str:
                    rows_to_delete.append(idx + 2)
            batch_delete_rows(sheet_task, rows_to_delete)
        except Exception as e:
            st.warning(f"ลบ Task Data: {e}")

        load_master_data.clear()
        load_completed_data.clear()
        load_task_data.clear()
        return True
    except Exception as e:
        st.error(f"Error deleting from sheets: {e}")
        return False

def delete_record_session(client, spreadsheet_name, pea_no, date_str, time_str):
    try:
        sh = client.open(spreadsheet_name)
        sheet_record = sh.worksheet("Record Data")
        records = sheet_record.get_all_records()
        
        rows_to_delete = []
        for idx, row in enumerate(records):
            if (str(row.get('PEA NO', '')).strip() == str(pea_no).strip() and 
                str(row.get('วันที่', '')).strip() == str(date_str).strip() and 
                str(row.get('เวลา', '')).strip() == str(time_str).strip()):
                rows_to_delete.append(idx + 2) 
                
        for row_idx in reversed(rows_to_delete):
            sheet_record.delete_row(row_idx)
            
        load_completed_data.clear()
        return True
    except Exception as e:
        st.error(f"Error deleting record session: {e}")
        return False

def calculate_transformer_status(df_master, df_record, pea):
    try:
        pea_str = str(pea).strip()
        master_row = df_master[df_master['PEANO หม้อแปลง'].astype(str).str.strip() == pea_str]
        if master_row.empty: return None, None
        kva_float = safe_float(master_row.iloc[0].get('ค่าพิกัด kVA หม้อแปลง', 0))
        if kva_float <= 0: return None, None
        
        col_pea_record = "PEA NO" if "PEA NO" in df_record.columns else df_record.columns[2] if len(df_record.columns) > 2 else None
        if not col_pea_record: return None, None
        
        record_rows = df_record[df_record[col_pea_record].astype(str).str.strip() == pea_str]
        if record_rows.empty: return None, None
        
        col_date = "วันที่" if "วันที่" in record_rows.columns else record_rows.columns[0]
        col_time = "เวลา" if "เวลา" in record_rows.columns else record_rows.columns[1]
        col_feeder = "ฟิดเดอร์" if "ฟิดเดอร์" in record_rows.columns else "Feeder" if "Feeder" in record_rows.columns else record_rows.columns[3]
        col_a = "กระแส A" if "กระแส A" in record_rows.columns else "Ph A" if "Ph A" in record_rows.columns else record_rows.columns[4]
        col_b = "กระแส B" if "กระแส B" in record_rows.columns else "Ph B" if "Ph B" in record_rows.columns else record_rows.columns[5]
        col_c = "กระแส C" if "กระแส C" in record_rows.columns else "Ph C" if "Ph C" in record_rows.columns else record_rows.columns[6]
        
        temp_df = record_rows.copy()
        temp_df['DT'] = pd.to_datetime(temp_df[col_date].astype(str) + ' ' + temp_df[col_time].astype(str), format='%d/%m/%Y %H:%M:%S', errors='coerce')
        temp_df = temp_df.sort_values(by='DT', ascending=False)
        
        if temp_df['DT'].notna().any():
            latest_session = temp_df[temp_df['DT'] == temp_df['DT'].iloc[0]]
        else:
            last_date = record_rows[col_date].iloc[-1]
            last_time = record_rows[col_time].iloc[-1]
            latest_session = record_rows[(record_rows[col_date] == last_date) & (record_rows[col_time] == last_time)]
            
        is_total_row = latest_session[col_feeder].astype(str).str.replace(' ', '') == 'รวม'
        sum_row = latest_session[is_total_row]
        
        if not sum_row.empty:
            tot_a = safe_float(sum_row.iloc[0].get(col_a, 0))
            tot_b = safe_float(sum_row.iloc[0].get(col_b, 0))
            tot_c = safe_float(sum_row.iloc[0].get(col_c, 0))
        else:
            tot_a = pd.to_numeric(latest_session[col_a], errors='coerce').fillna(0).sum()
            tot_b = pd.to_numeric(latest_session[col_b], errors='coerce').fillna(0).sum()
            tot_c = pd.to_numeric(latest_session[col_c], errors='coerce').fillna(0).sum()
            
        i_max = (kva_float * 1000) / (math.sqrt(3) * 400)
        max_i = max(tot_a, tot_b, tot_c)
        pct_load = (max_i / i_max) * 100 if i_max > 0 else 0
        
        avg_i = (tot_a + tot_b + tot_c) / 3
        pct_unb = 0
        if avg_i > 0:
            max_dev = max(abs(tot_a - avg_i), abs(tot_b - avg_i), abs(tot_c - avg_i))
            pct_unb = (max_dev / avg_i) * 100
            
        return pct_load, pct_unb
    except Exception:
        return None, None

@st.cache_data(ttl=60)
def load_completed_data(_client, spreadsheet_name):
    try:
        sheet = _client.open(spreadsheet_name).worksheet("Record Data")
        data = sheet.get_all_values()
        if len(data) > 0:
            headers = data[0]
            df = pd.DataFrame(data[1:], columns=headers)
        else:
            df = pd.DataFrame()
            
        if not df.empty:
            df.columns = df.columns.str.strip()
            cols = list(df.columns)
            if len(cols) > 0: cols[0] = 'วันที่'
            if len(cols) > 1: cols[1] = 'เวลา'
            if len(cols) > 2: cols[2] = 'PEA NO'
            df.columns = cols
        return df
    except Exception as e:
        import streamlit as st
        st.error(f"Error loading completed data: {str(e)}")
        return pd.DataFrame()

@st.cache_data(ttl=30)
def load_task_data(_client, spreadsheet_name):
    try:
        sheet = _client.open(spreadsheet_name).worksheet("Task Data")
        data = sheet.get_all_values()
        if len(data) > 0:
            headers = data[0]
            df = pd.DataFrame(data[1:], columns=headers)
        else:
            df = pd.DataFrame()
        return df
    except Exception:
        return pd.DataFrame(columns=["PEA NO", "Status", "Date"])

def add_task_to_sheet(client, spreadsheet_name, pea_no):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            sh = client.open(spreadsheet_name)
            try:
                sheet = sh.worksheet("Task Data")
            except gspread.exceptions.WorksheetNotFound:
                sheet = sh.add_worksheet(title="Task Data", rows=1000, cols=3)
                sheet.append_row(["PEA NO", "Status", "Date"])
            
            now_str = datetime.datetime.now(pytz.timezone('Asia/Bangkok')).strftime('%d/%m/%Y %H:%M:%S')
            sheet.append_row([str(pea_no), "Pending", now_str])
            
            load_task_data.clear()
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(random.uniform(1.5, 3.0))
            else:
                st.error(f"Error adding task: {e}")
                return False

@st.dialog("รายละเอียดหม้อแปลง", width="large")
def show_transformer_details(pea_no, df_m, df_r):
    st.markdown(f"**⚡ ข้อมูลพื้นฐาน (Master Data): PEA {pea_no}**")
    
    # 1. ค้นหาข้อมูล
    master_row = df_m[df_m['PEANO หม้อแปลง'].astype(str) == pea_no]
    
    # 2. นำข้อมูลมาจัดเรียงใหม่ให้อ่านง่าย (หากพบข้อมูล)
    if not master_row.empty:
        m_data = master_row.iloc[0]
        
        st.markdown("""
        <style>
        .profile-prop { font-size: 0.85rem; color: #64748b; margin-bottom: 2px; }
        .profile-val { font-size: 1rem; color: #1e293b; font-weight: 600; margin-bottom: 15px; }
        </style>
        """, unsafe_allow_html=True)
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(f"<div class='profile-prop'>รหัส PEA NO</div><div class='profile-val'>{m_data.get('PEANO หม้อแปลง', '-')}</div>", unsafe_allow_html=True)
            st.markdown(f"<div class='profile-prop'>ยี่ห้อหม้อแปลง</div><div class='profile-val'>{m_data.get('ยี่ห้อของหม้อแปลง', '-')}</div>", unsafe_allow_html=True)
        with col2:
            st.markdown(f"<div class='profile-prop'>พิกัด kVA</div><div class='profile-val'>{m_data.get('ค่าพิกัด kVA หม้อแปลง', '-')} kVA</div>", unsafe_allow_html=True)
            st.markdown(f"<div class='profile-prop'>ระบบเฟส</div><div class='profile-val'>{m_data.get('ระบบ', '-')} เฟส</div>", unsafe_allow_html=True)
        with col3:
            st.markdown(f"<div class='profile-prop'>สถานที่ติดตั้ง</div><div class='profile-val'>{m_data.get('สถานที่', '-')}</div>", unsafe_allow_html=True)
            st.markdown(f"<div class='profile-prop'>พิกัด (Lat, Lng)</div><div class='profile-val'>{m_data.get('LATITUDE', '-')}, {m_data.get('LONGITUDE', '-')}</div>", unsafe_allow_html=True)
        
        st.markdown("---")
    else:
        st.warning("ไม่พบข้อมูล Master Data")
    
    # ส่วน Record Data คงเดิม (เพราะเป็นตารางหลายบรรทัด เหมาะกับการใช้ DataFrame แล้ว)
    record_rows = df_r[df_r['PEA NO'].astype(str) == pea_no]
    if not record_rows.empty:
        st.markdown(f"**📝 ข้อมูลผลการวัดโหลด (Record Data)**")
        st.dataframe(record_rows, use_container_width=True, hide_index=True)

def check_undervoltage(v_an, v_bn, v_cn, threshold=207.0):
    """
    ตรวจสอบแรงดันตก (ไฟตก)
    คืนค่า (พบไฟตกหรือไม่ (bool), รายชื่อเฟสที่ไฟตก (list), แรงดันต่ำสุดที่พบ (float))
    """
    van = safe_float(v_an)
    vbn = safe_float(v_bn)
    vcn = safe_float(v_cn)
    
    # ป้องกันกรณีผู้ใช้ไม่ได้กรอกข้อมูล (ค่าเป็น 0)
    if van == 0 and vbn == 0 and vcn == 0:
        return False, [], 0.0
        
    drop_phases = []
    min_v = 999.0
    
    if 10 < van < threshold: 
        drop_phases.append("A")
        min_v = min(min_v, van)
    if 10 < vbn < threshold: 
        drop_phases.append("B")
        min_v = min(min_v, vbn)
    if 10 < vcn < threshold: 
        drop_phases.append("C")
        min_v = min(min_v, vcn)
        
    return len(drop_phases) > 0, drop_phases, min_v

def check_bitcoin_harmonic_risk(a, b, c, n, threshold_diff=15.0):
    """
    ตรวจสอบพฤติกรรมเสี่ยงขุดบิตคอยน์ / ลักใช้ไฟ ด้วยการวิเคราะห์ความเบี่ยงเบนของกระแส N (Harmonic)
    คืนค่า (พบความเสี่ยงหรือไม่ (bool), ค่ากระแส N ตามทฤษฎี (float), ค่าความต่าง (float))
    """
    a_val = safe_float(a)
    b_val = safe_float(b)
    c_val = safe_float(c)
    n_val = safe_float(n)
    
    if a_val == 0 and b_val == 0 and c_val == 0 and n_val == 0:
        return False, 0.0, 0.0
        
    # คำนวณ In ทางทฤษฎีสำหรับโหลดเชิงเส้น (Linear Load) 3 เฟส 4 สาย
    # In = sqrt(Ia^2 + Ib^2 + Ic^2 - Ia*Ib - Ib*Ic - Ic*Ia)
    inside_sqrt = (a_val**2) + (b_val**2) + (c_val**2) - (a_val * b_val) - (b_val * c_val) - (c_val * a_val)
    if inside_sqrt < 0:
        inside_sqrt = 0
        
    n_theory = math.sqrt(inside_sqrt)
    diff = abs(n_val - n_theory)
    
    # พบความเสี่ยงต่อเมื่อความต่างสูงกว่า threshold ที่กำหนด
    is_risk = diff > threshold_diff
    return is_risk, n_theory, diff

def fetch_google_drive_image_base64(file_id):
    """ฟังก์ชันสำหรับดึงรูปภาพจาก Google Drive แปลงเป็น Base64 เพื่อให้ Streamlit แสดงผลได้"""
    try:
        url = f"https://drive.google.com/uc?id={file_id}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            encoded_image = base64.b64encode(response.content).decode('utf-8')
            return f"data:image/jpeg;base64,{encoded_image}"
    except Exception as e:
        return None
    return None
