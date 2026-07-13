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

# --- 1. ตั้งค่าหน้าเว็บ Streamlit ---
st.set_page_config(
    page_title="ระบบบันทึกและตรวจสอบโหลดหม้อแปลง PEA",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- Offline Protection ---
import streamlit.components.v1 as components
components.html("""
<script>
    window.addEventListener('offline', function(e) {
        alert('⚠️ สัญญาณอินเทอร์เน็ตขาดหาย! โปรดหาพื้นที่ที่มีสัญญาณก่อนกรอกหรือบันทึกข้อมูล เพื่อป้องกันข้อมูลสูญหาย');
    });
    window.addEventListener('online', function(e) {
        alert('✅ กลับมาออนไลน์แล้ว สามารถใช้งานและบันทึกข้อมูลต่อได้ตามปกติครับ');
    });
</script>
""", height=0)

# --- CUSTOM CSS: Professional UX + Mobile Responsive ---
st.markdown("""
<style>
/* ===== Google Fonts ===== */
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');

/* ===== Global ===== */
html, body, [class*="css"] {
    font-family: 'Prompt', sans-serif !important;
}

/* ===== Hide default Streamlit elements ===== */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}

/* ===== Main container padding for mobile ===== */
.block-container {
    padding-top: 3.5rem !important;
    padding-bottom: 1rem !important;
    max-width: 100% !important;
}
header[data-testid="stHeader"] {
    background-color: transparent !important;
}

/* ===== Sidebar ===== */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
    min-width: 220px !important;
    max-width: 220px !important;
}
[data-testid="stSidebar"] .block-container {
    padding-top: 0.5rem !important;
}
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p,
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h1,
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h2,
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3 {
    color: #ffffff !important;
}
/* Sidebar logo size */
[data-testid="stSidebar"] [data-testid="stImage"] {
    max-width: 80px !important;
    margin: 0 auto !important;
    display: block !important;
}
[data-testid="stSidebar"] button[kind="secondary"],
[data-testid="stSidebar"] button[kind="primary"] {
    background: rgba(255,255,255,0.08) !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    color: #e0e0e0 !important;
    border-radius: 10px !important;
    padding: 0.5rem 0.8rem !important;
    font-weight: 500 !important;
    font-size: 0.85rem !important;
    transition: all 0.3s ease !important;
    backdrop-filter: blur(5px) !important;
    margin-bottom: 3px !important;
    font-family: 'Prompt', sans-serif !important;
}
[data-testid="stSidebar"] button:hover {
    background: rgba(255,255,255,0.18) !important;
    border-color: #e94560 !important;
    color: #ffffff !important;
    transform: translateX(4px);
}

/* ===== Top header banner ===== */
.app-header {
    background: linear-gradient(135deg, #0f3460 0%, #16213e 40%, #e94560 100%);
    color: white;
    padding: 1.2rem 1.5rem;
    border-radius: 14px;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 20px rgba(233,69,96,0.25);
}
.app-header .icon { font-size: 2rem; }
.app-header .title { font-size: 1.4rem; font-weight: 700; margin: 0; }
.app-header .subtitle { font-size: 0.85rem; opacity: 0.85; margin: 0; }

/* ===== Section Card (glass effect) ===== */
.section-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 1.2rem;
    margin-bottom: 1rem;
    backdrop-filter: blur(10px);
}

/* ===== Dashboard Metric Cards ===== */
.metric-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 1rem; }
.metric-card {
    flex: 1 1 140px;
    border-radius: 14px;
    padding: 1rem 1.2rem;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    transition: transform 0.2s ease;
}
.metric-card:hover { transform: translateY(-3px); }
.metric-card .value { font-size: 2rem; font-weight: 700; margin: 0; }
.metric-card .label { font-size: 0.8rem; font-weight: 500; margin: 0; opacity: 0.8; }
.metric-total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.metric-done { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
.metric-pending { background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%); color: #333; }

/* ===== Progress bar ===== */
.progress-wrapper { margin-bottom: 1.2rem; }
.progress-bar-bg {
    background: rgba(255,255,255,0.1);
    border-radius: 99px;
    height: 18px;
    overflow: hidden;
    position: relative;
}
.progress-bar-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
    transition: width 0.6s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
}

/* ===== Table header ===== */
.table-header {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    padding: 10px 14px;
    border-radius: 10px;
    color: white;
    display: flex;
    font-weight: 600;
    font-size: 0.85rem;
    margin-bottom: 6px;
}
.table-header > div { flex: 1; }
.th-pea { flex: 2 !important; }
.th-loc { flex: 3 !important; }
.th-kva { flex: 1.5 !important; }
.th-phase { flex: 1.5 !important; }

/* ===== Info banner (transformer info) ===== */
.tr-info-banner {
    background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    color: white;
    padding: 1rem 1.2rem;
    border-radius: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    margin-bottom: 0.8rem;
    box-shadow: 0 3px 12px rgba(15,52,96,0.3);
}
.tr-info-item { display: flex; align-items: center; gap: 6px; }
.tr-info-item .lbl { opacity: 0.7; font-size: 0.8rem; }
.tr-info-item .val { font-weight: 600; font-size: 0.95rem; }

/* ===== Feeder card ===== */
.feeder-card {
    background: linear-gradient(135deg, rgba(15,52,96,0.08), rgba(233,69,96,0.04));
    border: 1px solid rgba(15,52,96,0.12);
    border-radius: 12px;
    padding: 1rem 1.2rem;
    margin-bottom: 0.8rem;
}
.feeder-card-title {
    font-weight: 600;
    font-size: 1rem;
    color: #0f3460;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 6px;
}

/* ===== Summation card ===== */
.sum-card {
    background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%);
    color: white;
    border-radius: 14px;
    padding: 1.2rem;
    margin-top: 0.5rem;
    margin-bottom: 0.8rem;
    box-shadow: 0 4px 18px rgba(15,52,96,0.3);
}
.sum-card-title {
    font-weight: 600;
    font-size: 1.05rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 6px;
}

/* ===== Primary button override ===== */
button[kind="primary"] {
    background: linear-gradient(135deg, #e94560, #c62a40) !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    padding: 0.6rem 1.5rem !important;
    transition: all 0.3s ease !important;
    font-family: 'Prompt', sans-serif !important;
}
button[kind="primary"]:hover {
    box-shadow: 0 4px 16px rgba(233,69,96,0.4) !important;
    transform: translateY(-2px);
}

/* ===== Tabs styling ===== */
.stTabs [data-baseweb="tab-list"] {
    gap: 8px;
    border-bottom: 2px solid #e9ecef;
    padding-bottom: 0px;
}
.stTabs [data-baseweb="tab"] {
    border-radius: 12px 12px 0 0 !important;
    padding: 10px 24px !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    font-family: 'Prompt', sans-serif !important;
    color: #6c757d !important;
    background-color: #f8f9fa !important;
    border: 1px solid #e9ecef !important;
    border-bottom: none !important;
    transition: all 0.3s ease !important;
    margin-bottom: -2px; /* Pull down to cover border */
}
.stTabs [data-baseweb="tab"]:hover {
    background-color: #e9ecef !important;
    color: #333 !important;
}
.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #0f3460, #16213e) !important;
    color: white !important;
    border-color: #0f3460 !important;
    box-shadow: 0 -2px 10px rgba(15, 52, 96, 0.15) !important;
}
/* ซ่อนเส้นขีดล่างสีแดงของ Streamlit แบบดั้งเดิม */
.stTabs [data-baseweb="tab-highlight"] {
    display: none !important;
}

/* ===== Checkbox ===== */
.stCheckbox label span {
    font-weight: 500 !important;
    font-family: 'Prompt', sans-serif !important;
}

/* ===== Mobile Responsive ===== */
@media (max-width: 768px) {
    .block-container {
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
        padding-top: 2.5rem !important;
    }
    [data-testid="stSidebar"] {
        min-width: 200px !important;
        max-width: 200px !important;
    }
    [data-testid="stSidebar"] [data-testid="stImage"] {
        max-width: 65px !important;
    }
    .app-header {
        padding: 0.8rem 1rem;
        flex-direction: column;
        text-align: center;
        gap: 4px;
    }
    .app-header .icon { font-size: 1.6rem; }
    .app-header .title { font-size: 1rem; }
    .app-header .subtitle { font-size: 0.75rem; }
    .metric-row { gap: 6px; }
    .metric-card { padding: 0.6rem 0.7rem; }
    .metric-card .value { font-size: 1.4rem; }
    .metric-card .label { font-size: 0.7rem; }
    .table-header { font-size: 0.72rem; padding: 8px 10px; }
    .tr-info-banner { padding: 0.8rem; gap: 0.6rem; flex-direction: column; }
    .feeder-card { padding: 0.8rem; }
    .sum-card { padding: 0.8rem; }
    
    /* Stack columns on mobile */
    [data-testid="stHorizontalBlock"] {
        flex-wrap: wrap !important;
    }
    [data-testid="stHorizontalBlock"] > [data-testid="stColumn"] {
        min-width: 100% !important;
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .metric-card .value { font-size: 1.6rem; }
}
</style>
""", unsafe_allow_html=True)

# --- Helper Functions ---
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


# --- 2. ฟังก์ชันสำหรับเชื่อมต่อ Google Sheets ---
@st.cache_resource
def init_connection():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    
    # วิธีที่ 1: ลองอ่านจาก Streamlit Secrets (สำหรับ Cloud)
    try:
        creds_dict = dict(st.secrets["gcp_service_account"])
        credentials = Credentials.from_service_account_info(creds_dict, scopes=scopes)
        client = gspread.authorize(credentials)
        return client
    except Exception:
        pass
    
    # วิธีที่ 2: ลองอ่านจากไฟล์ credentials.json (สำหรับรันบนคอมพิวเตอร์ตัวเอง)
    try:
        credentials = Credentials.from_service_account_file("credentials.json", scopes=scopes)
        client = gspread.authorize(credentials)
        return client
    except FileNotFoundError:
        st.error("ไม่พบข้อมูลการเชื่อมต่อ กรุณานำไฟล์ 'credentials.json' มาวาง หรือตั้งค่าใน Streamlit Secrets")
        return None
    except Exception as e:
        st.error(f"เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets: {e}")
        return None

# --- 3. ฟังก์ชันสำหรับดึงข้อมูล MasterData ---
@st.cache_data(ttl=600)
def load_master_data(_client, spreadsheet_name="PEA_Transformer_DB"):
    try:
        sheet = _client.open(spreadsheet_name).worksheet("MasterData")
        data = sheet.get_all_records()
        df = pd.DataFrame(data)
        if 'LATITUDE' in df.columns and 'LONGITUDE' in df.columns:
            df['LATITUDE'] = pd.to_numeric(df['LATITUDE'], errors='coerce')
            df['LONGITUDE'] = pd.to_numeric(df['LONGITUDE'], errors='coerce')
        return df
    except gspread.exceptions.SpreadsheetNotFound:
        st.error(f"ไม่พบไฟล์ Google Sheet ที่ชื่อ '{spreadsheet_name}' กรุณาตรวจสอบว่าแชร์ไฟล์ให้ Service Account แล้วหรือยัง")
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
                time.sleep(random.uniform(1.5, 3.0)) # รอคิวหากมีการชนกัน
            else:
                st.error(f"Error adding master data: {e}")
                return False

def delete_transformer_from_all_sheets(client, spreadsheet_name, pea_no):
    try:
        sh = client.open(spreadsheet_name)
        pea_str = str(pea_no).strip()
        
        # ลบจาก MasterData
        try:
            sheet_master = sh.worksheet("MasterData")
            records = sheet_master.get_all_records()
            for idx, row in enumerate(records):
                if str(row.get('PEANO หม้อแปลง', '')).strip() == pea_str:
                    sheet_master.delete_rows(idx + 2)
                    break
        except Exception as e:
            st.warning(f"ลบ MasterData: {e}")

        # ลบจาก Record Data (ลบย้อนกลับจากล่างขึ้นบน เพื่อไม่ให้ index เลื่อน)
        try:
            sheet_record = sh.worksheet("Record Data")
            records = sheet_record.get_all_records()
            rows_to_delete = []
            for idx, row in enumerate(records):
                if str(row.get('PEA NO', '')).strip() == pea_str:
                    rows_to_delete.append(idx + 2)
            for row_idx in reversed(rows_to_delete):
                sheet_record.delete_rows(row_idx)
        except Exception as e:
            st.warning(f"ลบ Record Data: {e}")
            
        # ลบจาก Task Data (ลบย้อนกลับจากล่างขึ้นบน)
        try:
            sheet_task = sh.worksheet("Task Data")
            records = sheet_task.get_all_records()
            rows_to_delete = []
            for idx, row in enumerate(records):
                if str(row.get('PEA NO', '')).strip() == pea_str:
                    rows_to_delete.append(idx + 2)
            for row_idx in reversed(rows_to_delete):
                sheet_task.delete_rows(row_idx)
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
            # หาแถวที่ PEA NO, วันที่ และ เวลา ตรงกัน
            if (str(row.get('PEA NO', '')).strip() == str(pea_no).strip() and 
                str(row.get('วันที่', '')).strip() == str(date_str).strip() and 
                str(row.get('เวลา', '')).strip() == str(time_str).strip()):
                rows_to_delete.append(idx + 2) # +2 เพราะ index เริ่ม 0 และแถวแรกคือ Header
                
        # สั่งลบจากล่างขึ้นบน เพื่อไม่ให้ลำดับแถวคลาดเคลื่อน
        for row_idx in reversed(rows_to_delete):
            sheet_record.delete_rows(row_idx)
            
        load_completed_data.clear()
        return True
    except Exception as e:
        st.error(f"Error deleting record session: {e}")
        return False

def calculate_transformer_status(df_master, df_record, pea):
    try:
        master_row = df_master[df_master['PEANO หม้อแปลง'].astype(str) == pea]
        if master_row.empty: return None, None
        kva_float = safe_float(master_row.iloc[0].get('ค่าพิกัด kVA หม้อแปลง', 0))
        if kva_float <= 0: return None, None
        
        record_rows = df_record[df_record['PEA NO'].astype(str) == pea]
        if record_rows.empty: return None, None
        
        col_date = "วันที่" if "วันที่" in record_rows.columns else record_rows.columns[0]
        col_time = "เวลา" if "เวลา" in record_rows.columns else record_rows.columns[1]
        col_feeder = "ฟิดเดอร์" if "ฟิดเดอร์" in record_rows.columns else "Feeder" if "Feeder" in record_rows.columns else record_rows.columns[3]
        col_a = "กระแส A" if "กระแส A" in record_rows.columns else "Ph A" if "Ph A" in record_rows.columns else record_rows.columns[4]
        col_b = "กระแส B" if "กระแส B" in record_rows.columns else "Ph B" if "Ph B" in record_rows.columns else record_rows.columns[5]
        col_c = "กระแส C" if "กระแส C" in record_rows.columns else "Ph C" if "Ph C" in record_rows.columns else record_rows.columns[6]
        
        # --- ค้นหารอบการวัดที่ใหม่ล่าสุด (Latest Session) ---
        temp_df = record_rows.copy()
        temp_df['DT'] = pd.to_datetime(temp_df[col_date].astype(str) + ' ' + temp_df[col_time].astype(str), format='%d/%m/%Y %H:%M:%S', errors='coerce')
        temp_df = temp_df.sort_values(by='DT', ascending=False)
        
        if temp_df['DT'].notna().any():
            latest_session = temp_df[temp_df['DT'] == temp_df['DT'].iloc[0]]
        else:
            last_date = record_rows[col_date].iloc[-1]
            last_time = record_rows[col_time].iloc[-1]
            latest_session = record_rows[(record_rows[col_date] == last_date) & (record_rows[col_time] == last_time)]
            
        # --- คำนวณกระแส (เพิ่มการกำจัดช่องว่างในคำว่า "รวม") ---
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

# --- 3.5. ฟังก์ชันสำหรับดึงข้อมูลที่บันทึกไปแล้ว ---
@st.cache_data(ttl=60)
def load_completed_data(_client, spreadsheet_name):
    try:
        sheet = _client.open(spreadsheet_name).worksheet("Record Data")
        data = sheet.get_all_records()
        df = pd.DataFrame(data)
        return df
    except Exception:
        return pd.DataFrame()

# --- 3.6. ฟังก์ชันจัดการ Task Data ---
@st.cache_data(ttl=30)
def load_task_data(_client, spreadsheet_name):
    try:
        sheet = _client.open(spreadsheet_name).worksheet("Task Data")
        data = sheet.get_all_records()
        df = pd.DataFrame(data)
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
                sheet = sh.add_worksheet(title="Task Data", rows="1000", cols="3")
                sheet.append_row(["PEA NO", "Status", "Date"])
            
            now_str = (datetime.datetime.utcnow() + datetime.timedelta(hours=7)).strftime('%d/%m/%Y %H:%M:%S')
            sheet.append_row([str(pea_no), "Pending", now_str])
            
            load_task_data.clear()
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(random.uniform(1.5, 3.0))
            else:
                st.error(f"Error adding task: {e}")
                return False

# --- Dialog: รายละเอียดหม้อแปลง (Summary Page) ---
@st.dialog("รายละเอียดหม้อแปลง", width="large")
def show_transformer_details(pea_no, df_m, df_r):
    st.markdown(f"**⚡ ข้อมูลพื้นฐาน (Master Data): PEA {pea_no}**")
    master_row = df_m[df_m['PEANO หม้อแปลง'].astype(str) == pea_no]
    st.dataframe(master_row, use_container_width=True, hide_index=True)
    
    record_rows = df_r[df_r['PEA NO'].astype(str) == pea_no]
    if not record_rows.empty:
        st.markdown(f"**📝 ข้อมูลผลการวัดโหลด (Record Data)**")
        st.dataframe(record_rows, use_container_width=True, hide_index=True)


# --- 4. การจัดการสถานะ (Session State) ---
if 'page' not in st.session_state:
    st.session_state.page = "Map"
if 'selected_pea_from_map' not in st.session_state:
    st.session_state.selected_pea_from_map = None


# ตรวจสอบว่ามาจากการคลิกปุ่ม Edit ในแผนที่หรือไม่ (ผ่าน URL)
if 'pea' in st.query_params:
    st.session_state.page = "Form"
    st.session_state.selected_pea_from_map = st.query_params['pea']
    st.query_params.clear()

if 'profile_pea' in st.query_params:
    st.session_state.page = "Profile"
    st.session_state.selected_pea_for_profile = st.query_params['profile_pea']
    st.query_params.clear()

# เมนูด้านข้าง (Sidebar)
with st.sidebar:
    import os
    
    # --- Logo + Title (centered) ---
    if os.path.exists("pea-logo.png"):
        import base64 as b64_logo
        with open("pea-logo.png", "rb") as f_logo:
            logo_sidebar_b64 = b64_logo.b64encode(f_logo.read()).decode()
        st.markdown(f"""
        <div style="text-align:center; padding: 0.5rem 0 0.2rem 0;">
            <img src="data:image/png;base64,{logo_sidebar_b64}" style="width:70px; height:70px; object-fit:contain; margin-bottom:5px;">
            <div style="font-size:1rem; font-weight:700; color:#e94560; letter-spacing:1px;">PEA LOAD</div>
            <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); margin-top:1px;">Transformer Monitor</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="text-align:center; padding: 0.5rem 0 0.2rem 0;">
            <div style="font-size:2rem;">⚡</div>
            <div style="font-size:1rem; font-weight:700; color:#e94560; letter-spacing:1px;">PEA LOAD</div>
            <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); margin-top:1px;">Transformer Monitor</div>
        </div>
        """, unsafe_allow_html=True)
    st.markdown("---")
    
    st.markdown("<div style='font-size:0.75rem; color:#a0a0a0; font-weight:600; margin-bottom:8px; padding-left:5px; white-space:nowrap; letter-spacing:-0.2px;'>📱 สำหรับหน้างาน (Field Work)</div>", unsafe_allow_html=True)
    
    if st.button("🗺️  แผนที่หม้อแปลง", use_container_width=True):
        st.session_state.page = "Map"
        st.rerun()
        
    if st.button("📝  บันทึกข้อมูล", use_container_width=True):
        st.session_state.page = "Form"
        st.rerun()
    
    st.markdown("<div style='font-size:0.75rem; color:#a0a0a0; font-weight:600; margin-bottom:8px; margin-top:15px; padding-left:5px; white-space:nowrap; letter-spacing:-0.2px;'>💻 สำหรับหลังบ้าน (Back Office)</div>", unsafe_allow_html=True)
    
    if st.button("📊  สรุปผลงาน", use_container_width=True):
        st.session_state.page = "Summary"
        st.rerun()
        
    if st.button("🔍  กรองข้อมูล (Filter)", use_container_width=True):
        st.session_state.page = "Filter"
        st.rerun()
        
    if st.button("📋  ประวัติหม้อแปลง", use_container_width=True):
        st.session_state.page = "Profile"
        st.session_state.selected_pea_for_profile = None 
        st.rerun()
        
    if st.button("➕  ลงทะเบียนหม้อแปลง", use_container_width=True):
        st.session_state.page = "Register"
        st.rerun()

    
    st.markdown("---")
    if st.button("🔄 ดึงข้อมูลล่าสุด (Refresh)", use_container_width=True, type="secondary"):
        st.cache_data.clear()
        st.rerun()
    st.markdown("---")
    st.markdown(f"""
    <div style="text-align:center; padding: 0.5rem 0; opacity: 0.5; font-size: 0.7rem; color: white;">
        📅 {(datetime.datetime.utcnow() + datetime.timedelta(hours=7)).strftime('%d/%m/%Y %H:%M')}
    </div>
    """, unsafe_allow_html=True)

# --- 5. Header Banner ---
import base64
icon_html = '<div class="icon">⚡</div>'
if os.path.exists("pea-logo.png"):
    with open("pea-logo.png", "rb") as img_file:
        logo_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        icon_html = f'<img src="data:image/png;base64,{logo_base64}" style="width:45px; height:45px; object-fit:contain; margin-right:15px;">'

st.markdown(f"""
<div class="app-header" style="display:flex; align-items:center;">
    {icon_html}
    <div>
        <p class="title">ระบบบันทึกและตรวจสอบโหลดหม้อแปลง PEA</p>
        <p class="subtitle">Transformer Load Monitoring System</p>
    </div>
</div>
""", unsafe_allow_html=True)


# --- 6. Main UI ---
client = init_connection()

if client:
    SHEET_NAME = "วัดโหลดหม้อแปลง ตามแผนงาน"
    df_master = load_master_data(client, SHEET_NAME)
    
    if not df_master.empty:
        required_cols = ['PEANO หม้อแปลง', 'ค่าพิกัด kVA หม้อแปลง']
        if all(col in df_master.columns for col in required_cols):
            
            df_record = load_completed_data(client, SHEET_NAME)
            df_task = load_task_data(client, SHEET_NAME)
            
            # คำนวณสถานะหมุดแต่ละเครื่อง
            # 1. หารายการล่าสุดที่ถูกบันทึก (Record Data)
            record_latest = {}
            if not df_record.empty and 'PEA NO' in df_record.columns:
                # พยายามหาวันที่/เวลา เพื่อเปรียบเทียบ (ถ้าไม่มี ให้ถือว่าบันทึกแล้วก็พอ)
                for _, row in df_record.iterrows():
                    pea = str(row.get('PEA NO', '')).strip()
                    record_latest[pea] = True
            
            completed_peas = list(record_latest.keys())
            
            # 2. หารายการล่าสุดที่ถูกสั่งงาน (Task Data)
            task_pending = {}
            if not df_task.empty and 'PEA NO' in df_task.columns:
                for _, row in df_task.iterrows():
                    pea = str(row.get('PEA NO', '')).strip()
                    status = str(row.get('Status', '')).strip()
                    if status == "Pending":
                        task_pending[pea] = True
                    elif status == "Done":
                        if pea in task_pending:
                            del task_pending[pea]
            
            # สร้าง df_map เพื่อแสดงผลบนแผนที่ (ตัดพวกที่ตรวจแล้วและไม่มีงานออกไป)
            map_markers = []
            for _, row in df_master.iterrows():
                pea = str(row.get('PEANO หม้อแปลง', '')).strip()
                if pea in task_pending:
                    # ถ้ามีคำสั่งตรวจสอบซ้ำ -> สีส้ม
                    row_dict = row.to_dict()
                    row_dict['MarkerColor'] = 'orange'
                    map_markers.append(row_dict)
                elif pea not in record_latest:
                    # ถ้ายังไม่เคยตรวจเลย -> สีแดง
                    row_dict = row.to_dict()
                    row_dict['MarkerColor'] = 'red'
                    map_markers.append(row_dict)
                else:
                    # ตรวจแล้ว และไม่มีคำสั่งซ้ำ -> ซ่อน (ไม่เพิ่มลงใน map_markers)
                    pass
            
            df_map = pd.DataFrame(map_markers)
            
            df_pending = df_map.copy() if not df_map.empty else pd.DataFrame(columns=df_master.columns)
            
            # ==============================
            # หน้าที่ 1: MAP PAGE
            # ==============================
            if st.session_state.page == "Map":
                st.markdown("#### 🗺️ แผนที่ตำแหน่งหม้อแปลง")
                st.caption("💡 คลิกที่หมุดเพื่อดูข้อมูลและนำทางไปยังหม้อแปลง (🔴=ยังไม่ตรวจ, 🟠=สั่งตรวจสอบซ้ำ)")
                
                if 'LATITUDE' in df_pending.columns and 'LONGITUDE' in df_pending.columns:
                    map_data = df_pending.dropna(subset=['LATITUDE', 'LONGITUDE'])
                    
                    # --- [เพิ่มใหม่] ตัวกรองประเภทหมุด ---
                    map_filter = st.radio(
                        "กรองประเภทงาน:",
                        options=["ทั้งหมด", "🔴 ยังไม่ตรวจ", "🟠 สั่งตรวจสอบซ้ำ"],
                        horizontal=True,
                        label_visibility="collapsed"
                    )
                    
                    # ตัดข้อมูลตามที่ผู้ใช้เลือก
                    if map_filter == "🔴 ยังไม่ตรวจ":
                        map_data = map_data[map_data['MarkerColor'] == 'red']
                    elif map_filter == "🟠 สั่งตรวจสอบซ้ำ":
                        map_data = map_data[map_data['MarkerColor'] == 'orange']
                    # -----------------------------------
                    
                    if not map_data.empty:
                        center_lat = map_data['LATITUDE'].mean()
                        center_lon = map_data['LONGITUDE'].mean()
                        
                        m = folium.Map(location=[center_lat, center_lon], zoom_start=12)
                        
                        # เพิ่มปุ่มค้นหาตำแหน่งปัจจุบันของผู้ใช้ (GPS)
                        LocateControl(
                            position="topleft",
                            drawCircle=True,
                            flyTo=True,
                            strings={"title": "แสดงตำแหน่งปัจจุบันของฉัน"}
                        ).add_to(m)
                        
                        @st.dialog("📍 ข้อมูลหม้อแปลง")
                        def show_transformer_dialog(pea_no, row_data):
                            phase_val = row_data.get('ระบบเฟส', '-')
                            kva_val = row_data.get('ค่าพิกัด kVA หม้อแปลง', '-')
                            location_val = row_data.get('สถานที่', '-')
                            lat_val = row_data['LATITUDE']
                            lon_val = row_data['LONGITUDE']
                            
                            st.markdown(f"""
                            <div class="tr-info-banner">
                                <div class="tr-info-item"><div class="lbl">📌 PEA NO</div><div class="val">{pea_no}</div></div>
                                <div class="tr-info-item"><div class="lbl">⚡ เฟส</div><div class="val">{phase_val}</div></div>
                                <div class="tr-info-item"><div class="lbl">🔋 kVA</div><div class="val">{kva_val}</div></div>
                                <div class="tr-info-item"><div class="lbl">📍 สถานที่</div><div class="val">{location_val}</div></div>
                            </div>
                            """, unsafe_allow_html=True)
                            
                            col1, col2 = st.columns(2)
                            google_maps_url = f"https://www.google.com/maps/dir/?api=1&destination={lat_val},{lon_val}"
                            with col1:
                                st.link_button("🚗 นำทาง", url=google_maps_url, use_container_width=True)
                            with col2:
                                if st.button("📝 บันทึกข้อมูล", type="primary", use_container_width=True):
                                    st.session_state.page = "Form"
                                    st.session_state.selected_pea_from_map = pea_no
                                    st.rerun()

                        # สร้าง MarkerCluster เพื่อยุบรวมหมุดที่อยู่ใกล้กัน
                        marker_cluster = MarkerCluster().add_to(m)
                        
                        # ปักหมุดลงใน MarkerCluster
                        for idx, row in map_data.iterrows():
                            pea_no_str = str(row['PEANO หม้อแปลง'])
                            color = row.get('MarkerColor', 'red')
                            folium.Marker(
                                [row['LATITUDE'], row['LONGITUDE']],
                                tooltip=pea_no_str,
                                icon=folium.Icon(color=color, icon="info-sign")
                            ).add_to(marker_cluster)
                        
                        st_data = st_folium(m, width="100%", height=500, returned_objects=["last_object_clicked_tooltip"])
                        
                        if st_data and st_data.get("last_object_clicked_tooltip"):
                            clicked_pea = st_data["last_object_clicked_tooltip"]
                            if st.session_state.get("last_dialog_pea") != clicked_pea:
                                st.session_state.last_dialog_pea = clicked_pea
                                row_data = df_pending[df_pending['PEANO หม้อแปลง'].astype(str) == clicked_pea]
                                if not row_data.empty:
                                    show_transformer_dialog(clicked_pea, row_data.iloc[0])
                    else:
                        st.success("🎉 เยี่ยมมาก! คุณดำเนินการบันทึกโหลดหม้อแปลงครบทุกจุดแล้ว")
                else:
                    st.warning("ไม่พบคอลัมน์ 'LATITUDE' หรือ 'LONGITUDE' ในชีต MasterData")
            
            # ==============================
            # หน้าที่ 2: FORM PAGE
            # ==============================
            elif st.session_state.page == "Form":
                st.markdown("#### 📝 ฟอร์มบันทึกการวัดโหลดหม้อแปลง")
                
                # --- จัดการโหมดแก้ไข (Edit Mode) ---
                is_edit_mode = st.session_state.get('edit_mode', False)
                edit_data = {}
                
                if is_edit_mode:
                    st.info(f"✏️ **กำลังแก้ไขข้อมูล:** PEA {st.session_state.edit_pea} (รอบเดิม: {st.session_state.edit_date} {st.session_state.edit_time})")
                    if st.button("❌ ยกเลิกการแก้ไข"):
                        st.session_state.edit_mode = False
                        st.rerun()
                        
                    # ดึงข้อมูลเดิมมาเตรียมไว้สำหรับกรอกลงฟอร์ม
                    old_df = df_record[(df_record['PEA NO'].astype(str) == st.session_state.edit_pea) &
                                       (df_record['วันที่'].astype(str) == st.session_state.edit_date) &
                                       (df_record['เวลา'].astype(str) == st.session_state.edit_time)]
                    for _, r in old_df.iterrows():
                        fname = str(r.get('ฟิดเดอร์', '')) if 'ฟิดเดอร์' in r else str(r.get('Feeder', ''))
                        fname = fname.strip()
                        col_a = "กระแส A" if "กระแส A" in r else "Ph A"
                        col_b = "กระแส B" if "กระแส B" in r else "Ph B"
                        col_c = "กระแส C" if "กระแส C" in r else "Ph C"
                        col_n = "กระแส N" if "กระแส N" in r else "N"
                        col_note = "หมายเหตุ" if "หมายเหตุ" in r else "Note"
                        
                        edit_data[fname] = {
                            "A": safe_float(r.get(col_a, 0)) if str(r.get(col_a, '')).strip() != "" else None,
                            "B": safe_float(r.get(col_b, 0)) if str(r.get(col_b, '')).strip() != "" else None,
                            "C": safe_float(r.get(col_c, 0)) if str(r.get(col_c, '')).strip() != "" else None,
                            "N": safe_float(r.get(col_n, 0)) if str(r.get(col_n, '')).strip() != "" else None,
                            "note": str(r.get(col_note, ''))
                        }

                # === Section 1: ข้อมูลทั่วไป ===
                st.markdown('<div class="section-card">', unsafe_allow_html=True)
                st.markdown("**📋 ข้อมูลทั่วไป**")
                
                col_pea1, col_pea2 = st.columns(2)
                with col_pea1:
                    thai_time = datetime.datetime.utcnow() + datetime.timedelta(hours=7)
                    def_date = thai_time.date()
                    def_time = thai_time.time()
                    
                    if is_edit_mode:
                        try:
                            def_date = datetime.datetime.strptime(st.session_state.edit_date, "%d/%m/%Y").date()
                            def_time = datetime.datetime.strptime(st.session_state.edit_time, "%H:%M:%S").time()
                        except: pass
                        
                    record_date = st.date_input("📅 วันที่", def_date)
                    record_time = st.time_input("🕐 เวลา", value=def_time, step=60)
                
                with col_pea2:
                    pea_list = df_master['PEANO หม้อแปลง'].astype(str).unique().tolist()
                    default_idx = 0
                    if is_edit_mode and st.session_state.edit_pea in pea_list:
                        default_idx = pea_list.index(st.session_state.edit_pea)
                    elif st.session_state.selected_pea_from_map and st.session_state.selected_pea_from_map in pea_list:
                        default_idx = pea_list.index(st.session_state.selected_pea_from_map)
                    
                    if pea_list:
                        selected_pea = st.selectbox("🔍 ค้นหา/เลือก PEANO หม้อแปลง", options=pea_list, index=default_idx, disabled=is_edit_mode)
                        if selected_pea:
                            t_info = df_master[df_master['PEANO หม้อแปลง'].astype(str) == selected_pea].iloc[0]
                            phase = t_info.get('ระบบเฟส', '-')
                            kva = t_info.get('ค่าพิกัด kVA หม้อแปลง', '-')
                            loc = t_info.get('สถานที่', '-')
                            st.markdown(f"""
                            <div class="tr-info-banner">
                                <div class="tr-info-item"><div class="lbl">⚡ ระบบเฟส</div><div class="val">{phase}</div></div>
                                <div class="tr-info-item"><div class="lbl">🔋 พิกัด</div><div class="val">{kva} kVA</div></div>
                                <div class="tr-info-item"><div class="lbl">📍 สถานที่</div><div class="val">{loc}</div></div>
                            </div>
                            """, unsafe_allow_html=True)
                    else:
                        st.info("ไม่มีหม้อแปลงคงเหลือให้เลือก")
                        selected_pea = None
                st.markdown('</div>', unsafe_allow_html=True)

                # === Section 2: เลือกฟีดเดอร์ ===
                st.markdown('<div class="section-card">', unsafe_allow_html=True)
                st.markdown("**📌 เลือกฟีดเดอร์ที่ต้องการบันทึก**")
                chk_cols = st.columns(5)
                f1_checked = chk_cols[0].checkbox("F1", value=("F1" in edit_data))
                f2_checked = chk_cols[1].checkbox("F2", value=("F2" in edit_data))
                f3_checked = chk_cols[2].checkbox("F3", value=("F3" in edit_data))
                f4_checked = chk_cols[3].checkbox("F4", value=("F4" in edit_data))
                total_checked = chk_cols[4].checkbox("รวม", value=("รวม" in edit_data), help="กรณีวัดเมน หรือต้องการบันทึกค่ารวมแยกต่างหาก")
                st.markdown('</div>', unsafe_allow_html=True)
                
                selected_feeders = []
                if f1_checked: selected_feeders.append("F1")
                if f2_checked: selected_feeders.append("F2")
                if f3_checked: selected_feeders.append("F3")
                if f4_checked: selected_feeders.append("F4")
                
                # === Section 3: กรอกข้อมูลแต่ละฟีดเดอร์ ===
                feeder_inputs = {}
                for f_name in selected_feeders:
                    st.markdown(f"""
                    <div class="feeder-card">
                        <div class="feeder-card-title">⚡ ฟีดเดอร์ {f_name} — กระแสไฟฟ้า (Amp)</div>
                    </div>
                    """, unsafe_allow_html=True)
                    cols = st.columns(4)
                    val_a = cols[0].number_input(f"Phase A", min_value=0.0, step=0.1, key=f"{f_name}_A", value=edit_data.get(f_name, {}).get("A", None))
                    val_b = cols[1].number_input(f"Phase B", min_value=0.0, step=0.1, key=f"{f_name}_B", value=edit_data.get(f_name, {}).get("B", None))
                    val_c = cols[2].number_input(f"Phase C", min_value=0.0, step=0.1, key=f"{f_name}_C", value=edit_data.get(f_name, {}).get("C", None))
                    val_n = cols[3].number_input(f"Neutral (N)", min_value=0.0, step=0.1, key=f"{f_name}_N", value=edit_data.get(f_name, {}).get("N", None))
                    note = st.text_input(f"💬 หมายเหตุ {f_name}", key=f"{f_name}_note", value=edit_data.get(f_name, {}).get("note", ""), placeholder=f"หมายเหตุเฉพาะฟีดเดอร์ {f_name}...")
                    feeder_inputs[f_name] = {"A": val_a or 0.0, "B": val_b or 0.0, "C": val_c or 0.0, "N": val_n or 0.0, "note": note}
                
                # === Section 4: สรุปรวม ===
                sum_a = sum(d["A"] for d in feeder_inputs.values())
                sum_b = sum(d["B"] for d in feeder_inputs.values())
                sum_c = sum(d["C"] for d in feeder_inputs.values())
                sum_n = sum(d["N"] for d in feeder_inputs.values())
                
                tot_a = tot_b = tot_c = tot_n = 0.0
                tot_note = ""
                
                st.markdown("""
                <div class="sum-card">
                    <div class="sum-card-title">📊 สรุปสถานะรวมของหม้อแปลงเครื่องนี้</div>
                </div>
                """, unsafe_allow_html=True)
                
                if len(selected_feeders) > 0:
                    tot_cols = st.columns(4)
                    tot_a = tot_cols[0].number_input("รวม I_a (A)", value=float(sum_a), disabled=True)
                    tot_b = tot_cols[1].number_input("รวม I_b (A)", value=float(sum_b), disabled=True)
                    tot_c = tot_cols[2].number_input("รวม I_c (A)", value=float(sum_c), disabled=True)
                    tot_n = tot_cols[3].number_input("รวม I_n (A)", value=float(sum_n), disabled=True)
                    tot_note = st.text_input("💬 หมายเหตุ (รวม)", key="tot_note_auto", placeholder="หมายเหตุรวม...")
                else:
                    if total_checked:
                        tot_cols = st.columns(4)
                        tot_a = tot_cols[0].number_input("รวม I_a (A)", min_value=0.0, step=0.1, key="tot_a_manual", value=edit_data.get("รวม", {}).get("A", None))
                        tot_b = tot_cols[1].number_input("รวม I_b (A)", min_value=0.0, step=0.1, key="tot_b_manual", value=edit_data.get("รวม", {}).get("B", None))
                        tot_c = tot_cols[2].number_input("รวม I_c (A)", min_value=0.0, step=0.1, key="tot_c_manual", value=edit_data.get("รวม", {}).get("C", None))
                        tot_n = tot_cols[3].number_input("รวม I_n (A)", min_value=0.0, step=0.1, key="tot_n_manual", value=edit_data.get("รวม", {}).get("N", None))
                        tot_a = tot_a or 0.0
                        tot_b = tot_b or 0.0
                        tot_c = tot_c or 0.0
                        tot_n = tot_n or 0.0
                        tot_note = st.text_input("💬 หมายเหตุ (รวม)", key="tot_note_manual", value=edit_data.get("รวม", {}).get("note", ""), placeholder="หมายเหตุรวม...")
                    else:
                        st.info("กรุณาเลือกฟีดเดอร์อย่างน้อย 1 รายการ หรือเลือก 'รวม'")
                
                st.write("")
                btn_label = "💾 บันทึกการแก้ไข (อัปเดตข้อมูล)" if is_edit_mode else "💾 บันทึกข้อมูลและตรวจสอบ"
                submitted = st.button(btn_label, type="primary", use_container_width=True)
                    
                # --- ส่วนคำนวณและบันทึกลง Google Sheets ---
                if submitted and selected_pea:
                    transformer_info = df_master[df_master['PEANO หม้อแปลง'].astype(str) == selected_pea].iloc[0]
                    
                    kva_value = safe_float(transformer_info['ค่าพิกัด kVA หม้อแปลง'])
                    if kva_value == 0.0:
                        st.error("❌ ข้อมูล kVA ใน MasterData ไม่ถูกต้อง โปรดแก้ไขที่ฐานข้อมูลก่อนบันทึกครับ")
                        st.stop()
                    
                    i_max = (kva_value * 1000) / (math.sqrt(3) * 400)
                    max_current_measured = max(tot_a, tot_b, tot_c)
                    percent_load = (max_current_measured / i_max) * 100 if i_max > 0 else 0
                    
                    avg_current = (tot_a + tot_b + tot_c) / 3
                    if avg_current > 0:
                        dev_a = abs(tot_a - avg_current)
                        dev_b = abs(tot_b - avg_current)
                        dev_c = abs(tot_c - avg_current)
                        max_dev = max(dev_a, dev_b, dev_c)
                        percent_unbalance = (max_dev / avg_current) * 100
                    else:
                        percent_unbalance = 0.0
                    
                    st.write("---")
                    st.markdown(f"**⚡ พิกัดหม้อแปลง:** {kva_value} kVA | **พิกัดกระแสสูงสุด (I_max):** {i_max:.2f} A")
                    st.markdown(f"**📊 กระแสเฉลี่ย 3 เฟส:** {avg_current:.2f} A")
                    
                    col_alert1, col_alert2 = st.columns(2)
                    with col_alert1:
                        if percent_load > 100:
                            st.error(f"🔴 **Overload!**\n\nโหลดใช้งาน {percent_load:.2f}%\n(กระแสเฟสสูงสุด {max_current_measured:.2f} A)")
                        elif percent_load > 80:
                            st.warning(f"🟡 **เกินเกณฑ์ 80%!**\n\nโหลดใช้งาน {percent_load:.2f}%\n(ควรวางแผนลดโหลด)")
                        else:
                            st.success(f"🟢 **โหลดปกติ**\n\nโหลดใช้งาน {percent_load:.2f}%")
                            
                    with col_alert2:
                        if percent_unbalance > 30:
                            st.error(f"🔴 **Unbalance สูงมาก!**\n\nความไม่สมดุล {percent_unbalance:.2f}%")
                        elif percent_unbalance > 20:
                            st.warning(f"🟡 **Unbalance เกินเกณฑ์!**\n\nความไม่สมดุล {percent_unbalance:.2f}%")
                        else:
                            st.success(f"🟢 **กระแสสมดุลดี**\n\nความไม่สมดุล {percent_unbalance:.2f}%")

                    # ตรวจสอบการเลือกฟีดเดอร์ก่อนบันทึก
                    if len(selected_feeders) == 0 and not total_checked:
                        st.error("⚠️ กรุณาเลือกฟีดเดอร์ที่ต้องการบันทึกก่อนครับ")
                        st.stop()

                    with st.spinner("กำลังบันทึกข้อมูล... (ระบบอาจใช้เวลาสักครู่หากมีการใช้งานพร้อมกันหลายทีม)"):
                        
                        # [สำคัญ] หากมีโค้ดลบข้อมูลเดิม (delete_record_session) อยู่นอกลูป ให้ลบทิ้งได้เลยครับ 
                        # เพราะเราจะนำระบบลบและแทรกใหม่ มารวมไว้ในลูป Retry เพื่อความปลอดภัยของข้อมูล
                        
                        max_retries = 5  
                        success = False
                        
                        for attempt in range(max_retries):
                            try:
                                sheet_record = client.open(SHEET_NAME).worksheet("Record Data")
                                
                                rows_to_insert = []
                                for f_name, data in feeder_inputs.items():
                                    rows_to_insert.append([
                                        record_date.strftime("%d/%m/%Y"),
                                        record_time.strftime("%H:%M:%S"),
                                        selected_pea,
                                        f_name,
                                        data["A"], data["B"], data["C"], data["N"],
                                        data["note"]
                                    ])
                                
                                if total_checked or len(selected_feeders) > 0:
                                    rows_to_insert.append([
                                        record_date.strftime("%d/%m/%Y"),
                                        record_time.strftime("%H:%M:%S"),
                                        selected_pea,
                                        "รวม",
                                        tot_a, tot_b, tot_c, tot_n,
                                        tot_note
                                    ])
                                
                                # --- [แก้ไขใหม่] ระบบบันทึกทับตำแหน่งเดิม (In-place Update) ---
                                if is_edit_mode:
                                    records = sheet_record.get_all_records()
                                    rows_to_delete = []
                                    # 1. ค้นหาว่าข้อมูลรอบเดิมอยู่บรรทัดที่เท่าไหร่บ้าง
                                    for idx, row in enumerate(records):
                                        if (str(row.get('PEA NO', '')).strip() == str(st.session_state.edit_pea).strip() and 
                                            str(row.get('วันที่', '')).strip() == str(st.session_state.edit_date).strip() and 
                                            str(row.get('เวลา', '')).strip() == str(st.session_state.edit_time).strip()):
                                            rows_to_delete.append(idx + 2) # +2 เพราะ index เริ่ม 0 และมี Header
                                            
                                    if rows_to_delete:
                                        start_index = min(rows_to_delete)
                                        # 2. ลบข้อมูลเดิมทิ้ง (ลบจากล่างขึ้นบน)
                                        for row_idx in reversed(rows_to_delete):
                                            sheet_record.delete_rows(row_idx)
                                        # 3. แทรกข้อมูลใหม่เข้าไปที่ "ตำแหน่งเดิมเป๊ะๆ"
                                        sheet_record.insert_rows(rows_to_insert, row=start_index)
                                    else:
                                        # ถ้าหาประวัติเดิมไม่เจอจริงๆ ค่อยไปต่อท้าย
                                        sheet_record.append_rows(rows_to_insert)
                                else:
                                    # โหมดบันทึกปกติ (รายการใหม่) ให้ต่อท้ายบรรทัดล่างสุด
                                    sheet_record.append_rows(rows_to_insert)
                                # -------------------------------------------------------------
                                
                                success = True
                                break 
                                
                            except gspread.exceptions.WorksheetNotFound:
                                sh = client.open(SHEET_NAME)
                                sheet_record = sh.add_worksheet(title="Record Data", rows=1000, cols=10)
                                # สร้าง Header เริ่มต้น
                                sheet_record.append_row(["วันที่", "เวลา", "PEA NO", "ฟิดเดอร์", "กระแส A", "กระแส B", "กระแส C", "กระแส N", "หมายเหตุ"])
                                sheet_record.append_rows(rows_to_insert)
                                success = True
                                break
                            except Exception as e:
                                if attempt < max_retries - 1:
                                    # สุ่มรอ 1.5 ถึง 3 วินาที เพื่อหลบหลีกการชนกันซ้ำซ้อน
                                    wait_time = random.uniform(1.5, 3.0)
                                    time.sleep(wait_time)
                                else:
                                    st.error(f"❌ ระบบไม่ว่างเนื่องจากมีการส่งข้อมูลพร้อมกันมากเกินไป กรุณากดปุ่มบันทึกใหม่อีกครั้ง")

                        if success:
                            # หากเป็นการตรวจงานซ้ำ ให้บันทึกสถานะ Done
                            for task_attempt in range(3):
                                try:
                                    sheet_task = client.open(SHEET_NAME).worksheet("Task Data")
                                    now_str = (datetime.datetime.utcnow() + datetime.timedelta(hours=7)).strftime('%d/%m/%Y %H:%M:%S')
                                    sheet_task.append_row([selected_pea, "Done", now_str])
                                    break # สำเร็จแล้วออกจากลูป
                                except Exception:
                                    if task_attempt < 2:
                                        time.sleep(random.uniform(1.0, 2.0))
                                    else:
                                        pass # ถ้าพยายามครบ 3 ครั้งแล้วไม่สำเร็จ ให้ข้ามไป
                            
                            st.success("✅ บันทึกข้อมูลเรียบร้อยแล้ว!")
                            
                            # เช็คว่าถ้าเป็นการแก้ไข ให้เด้งกลับหน้าประวัติ แต่ถ้าลงใหม่ปกติให้ไปหน้าแผนที่
                            if is_edit_mode:
                                st.session_state.edit_mode = False
                                st.session_state.page = "Profile"
                            else:
                                st.session_state.page = "Map"
                                
                            st.session_state.selected_pea_from_map = None
                            if 'last_dialog_pea' in st.session_state:
                                del st.session_state['last_dialog_pea']
                            
                            load_completed_data.clear()
                            load_task_data.clear()
                            st.rerun()
            
            # ==============================
            # หน้าที่ 3: SUMMARY PAGE
            # ==============================
            elif st.session_state.page == "Summary":
                st.markdown("#### 📊 สรุปผลการดำเนินงาน")
                
                total_transformers = len(df_master)
                total_completed = len(completed_peas)
                total_pending = total_transformers - total_completed
                pct = (total_completed / total_transformers * 100) if total_transformers > 0 else 0
                
                count_normal = 0
                count_unbalance = 0
                count_overload = 0
                
                # --- เรียกใช้ฟังก์ชันแกนกลาง เพื่อให้นับเลขเป๊ะ 100% ---
                if not df_record.empty and total_completed > 0:
                    for pea in completed_peas:
                        pct_load, pct_unb = calculate_transformer_status(df_master, df_record, pea)
                        if pct_load is None: continue
                        
                        has_issue = False
                        
                        if pct_load >= 80:
                            count_overload += 1
                            has_issue = True
                            
                        if pct_unb >= 20:
                            count_unbalance += 1
                            has_issue = True
                            
                        if not has_issue:
                            count_normal += 1
                # ------------------------------------------------

                # Dashboard Metric Cards
                st.markdown(f"""
                <style>
                .health-row {{ display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 1.5rem; }}
                .health-card {{
                    flex: 1 1 100px;
                    border-radius: 14px;
                    padding: 0.8rem 1rem;
                    text-align: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: transform 0.2s ease;
                }}
                .health-card:hover {{ transform: translateY(-2px); }}
                .health-card .value {{ font-size: 1.5rem; font-weight: 700; margin: 0; }}
                .health-card .label {{ font-size: 0.75rem; font-weight: 600; margin: 0; opacity: 0.95; }}
                .bg-normal {{ background: linear-gradient(135deg, #00b09b, #96c93d); color: white; }}
                .bg-unb {{ background: linear-gradient(135deg, #f12711, #f5af19); color: white; }}
                .bg-ovl {{ background: linear-gradient(135deg, #ed213a, #93291e); color: white; }}
                </style>
                
                <div class="metric-row">
                    <div class="metric-card metric-total">
                        <p class="value">{total_transformers}</p>
                        <p class="label">หม้อแปลงทั้งหมด (จุด)</p>
                    </div>
                    <div class="metric-card metric-done">
                        <p class="value">{total_completed}</p>
                        <p class="label">✅ ทำเสร็จแล้ว</p>
                    </div>
                    <div class="metric-card metric-pending">
                        <p class="value">{total_pending}</p>
                        <p class="label">⏳ ยังไม่ได้ทำ</p>
                    </div>
                </div>
                
                <div class="health-row">
                    <div class="health-card bg-normal">
                        <p class="value">{count_normal}</p>
                        <p class="label">🟢 โหลดปกติ / สมดุล</p>
                    </div>
                    <div class="health-card bg-unb">
                        <p class="value">{count_unbalance}</p>
                        <p class="label">🟡 Unbalance (>20%)</p>
                    </div>
                    <div class="health-card bg-ovl">
                        <p class="value">{count_overload}</p>
                        <p class="label">🔴 Overload (>80%)</p>
                    </div>
                </div>
                """, unsafe_allow_html=True)
                
                # Progress bar
                st.markdown(f"""
                <div class="progress-wrapper">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px; opacity:0.7;">
                        <span>ความคืบหน้าภาพรวม</span>
                        <span>{pct:.1f}%</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width:{pct}%">{pct:.0f}%</div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
                
                tab1, tab2 = st.tabs(["✅ ทำเสร็จแล้ว", "⏳ ยังไม่เสร็จ"])
                
                with tab1:
                    search_completed = st.text_input("🔍 ค้นหาด้วย รหัส PEA หรือ สถานที่...", key="search_comp", placeholder="พิมพ์ค้นหา...")
                    if completed_peas:
                        df_completed_master = df_master[df_master['PEANO หม้อแปลง'].astype(str).isin(completed_peas)]
                        
                        mask = df_completed_master['PEANO หม้อแปลง'].astype(str).str.contains(search_completed, case=False, na=False) | \
                               df_completed_master['สถานที่'].astype(str).str.contains(search_completed, case=False, na=False)
                        filtered_df = df_completed_master[mask]
                        
                        st.markdown("""
                        <div class="table-header">
                            <div class="th-pea">PEA No.</div>
                            <div class="th-loc">สถานที่ติดตั้ง</div>
                            <div class="th-kva">ขนาด (kVA)</div>
                            <div class="th-phase">ระบบเฟส</div>
                            <div class="th-alert" style="flex: 2;">การแจ้งเตือน</div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        for _, row in filtered_df.head(50).iterrows():
                            pea = str(row['PEANO หม้อแปลง'])
                            c1, c2, c3, c4, c5 = st.columns([2, 3, 1.5, 1.5, 2])
                            
                            with c1:
                                if st.button(f"🔗 {pea}", key=f"btn_comp_{pea}", type="tertiary"):
                                    st.session_state.page = "Profile"
                                    st.session_state.selected_pea_for_profile = pea
                                    st.rerun()
                            
                            c2.write(row.get('สถานที่', '-'))
                            
                            kva_val = row.get('ค่าพิกัด kVA หม้อแปลง', '-')
                            c3.write(kva_val)
                            c4.write(row.get('ระบบเฟส', '-'))
                            
                            # --- คำนวณการแจ้งเตือน (ดึงจากฟังก์ชันกลาง) ---
                            status_html = '<span style="color: gray;">-</span>'
                            pct_load, pct_unb = calculate_transformer_status(df_master, df_record, pea)
                            
                            if pct_load is not None and pct_unb is not None:
                                alerts = []
                                if pct_load >= 100:
                                    alerts.append(f'<span style="background-color: #e94560; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; margin-bottom:4px; display:inline-block; font-weight:600;">🔴 Overload {pct_load:.0f}%</span>')
                                elif pct_load >= 80:
                                    alerts.append(f'<span style="background-color: #f7971e; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; margin-bottom:4px; display:inline-block; font-weight:600;">🟡 Load {pct_load:.0f}%</span>')
                                    
                                if pct_unb >= 30:
                                    alerts.append(f'<span style="background-color: #e94560; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; display:inline-block; font-weight:600;">🔴 Unbalance {pct_unb:.0f}%</span>')
                                elif pct_unb >= 20:
                                    alerts.append(f'<span style="background-color: #f7971e; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; display:inline-block; font-weight:600;">🟡 Unbalance {pct_unb:.0f}%</span>')
                                    
                                if alerts:
                                    status_html = "<div style='display:flex; flex-direction:column; gap:4px; align-items:flex-start;'>" + "".join(alerts) + "</div>"
                                else:
                                    status_html = '<span style="background-color: #11998e; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight:600;">🟢 ปกติ</span>'
                            else:
                                status_html = '<span style="color: gray; font-size: 0.8rem;">ไม่สามารถคำนวณได้</span>'
                                
                            c5.markdown(status_html, unsafe_allow_html=True)
                            
                            st.markdown("---")
                            
                        if len(filtered_df) > 50:
                            st.info(f"แสดงผล 50 จาก {len(filtered_df)} รายการ")
                    else:
                        st.info("ยังไม่มีข้อมูลหม้อแปลงที่ทำเสร็จแล้ว")
                
                with tab2:
                    search_pending = st.text_input("🔍 ค้นหาด้วย รหัส PEA หรือ สถานที่...", key="search_pend", placeholder="พิมพ์ค้นหา...")
                    if not df_pending.empty:
                        mask_p = df_pending['PEANO หม้อแปลง'].astype(str).str.contains(search_pending, case=False, na=False) | \
                                 df_pending['สถานที่'].astype(str).str.contains(search_pending, case=False, na=False)
                        filtered_df_p = df_pending[mask_p]
                        
                        st.markdown("""
                        <div class="table-header">
                            <div class="th-pea">PEA No.</div>
                            <div class="th-loc">สถานที่ติดตั้ง</div>
                            <div class="th-kva">ขนาด (kVA)</div>
                            <div class="th-phase">ระบบเฟส</div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        for _, row in filtered_df_p.head(50).iterrows():
                            pea = str(row['PEANO หม้อแปลง'])
                            c1, c2, c3, c4 = st.columns([2, 3, 1.5, 1.5])
                            
                            with c1:
                                if st.button(f"🔗 {pea}", key=f"btn_pend_{pea}", type="tertiary"):
                                    st.session_state.page = "Profile"
                                    st.session_state.selected_pea_for_profile = pea
                                    st.rerun()
                            
                            c2.write(row.get('สถานที่', '-'))
                            c3.write(row.get('ค่าพิกัด kVA หม้อแปลง', '-'))
                            c4.write(row.get('ระบบเฟส', '-'))
                            st.markdown("---")
                            
                        if len(filtered_df_p) > 50:
                            st.info(f"แสดงผล 50 จาก {len(filtered_df_p)} รายการ")
                    else:
                        st.success("🎉 ทำเสร็จครบทุกจุดแล้วครับ!")

            # ==============================
            # หน้าที่ 4: FILTER PAGE
            # ==============================
            elif st.session_state.page == "Filter":
                st.markdown("#### 🔍 กรองข้อมูลประวัติการวัดกระแส")
                
                if df_record.empty:
                    st.info("ยังไม่มีข้อมูลประวัติการวัดกระแส")
                else:
                    st.markdown('<div class="section-card">', unsafe_allow_html=True)
                    st.markdown("**1. เลือกเงื่อนไขการค้นหา**")
                    
                    col_f1, col_f2, col_f3 = st.columns(3)
                    
                    with col_f1:
                        pea_list = ["ทั้งหมด"] + sorted(df_record['PEA NO'].astype(str).unique().tolist())
                        selected_pea = st.selectbox("PEA NO หม้อแปลง", options=pea_list)
                    
                    with col_f2:
                        col_date = "วันที่" if "วันที่" in df_record.columns else df_record.columns[0]
                        date_list = ["ทั้งหมด"] + sorted(df_record[col_date].astype(str).unique().tolist(), reverse=True)
                        selected_date = st.selectbox("วันที่บันทึก", options=date_list)
                    
                    with col_f3:
                        status_filter = st.selectbox("สถานะการแจ้งเตือน", options=["ทั้งหมด", "🔴 Overload", "🟡 ใกล้เกินพิกัด", "🔴 Unbalance", "🟡 Unbalance", "🟢 ปกติ"])
                        
                    st.markdown("**2. กรองตามกระแสของฟีดเดอร์**")
                    col_f4, col_f5 = st.columns([1, 2])
                    with col_f4:
                        exclude_total = st.checkbox("✅ ไม่รวมแถวที่เป็นผล 'รวม'", value=True, help="แสดงเฉพาะข้อมูลของแต่ละฟีดเดอร์ (F1, F2,...)")
                    with col_f5:
                        min_amp, max_amp = st.slider("ช่วงกระแสที่ต้องการค้นหา (Amp)", min_value=0, max_value=250, value=(0, 250), step=5, help="ค้นหาหม้อแปลงที่มีกระแสเฟสใดเฟสหนึ่งอยู่ในช่วงนี้")
                        
                    st.markdown('</div>', unsafe_allow_html=True)
                    
                    # --- Data Processing ---
                    filtered_df = df_record.copy()
                    
                    if selected_pea != "ทั้งหมด":
                        filtered_df = filtered_df[filtered_df['PEA NO'].astype(str) == selected_pea]
                    
                    if selected_date != "ทั้งหมด":
                        filtered_df = filtered_df[filtered_df[col_date].astype(str) == selected_date]
                        
                    col_feeder = "ฟิดเดอร์" if "ฟิดเดอร์" in filtered_df.columns else "Feeder" if "Feeder" in filtered_df.columns else filtered_df.columns[3]
                    col_a = "กระแส A" if "กระแส A" in filtered_df.columns else "Ph A" if "Ph A" in filtered_df.columns else filtered_df.columns[4]
                    col_b = "กระแส B" if "กระแส B" in filtered_df.columns else "Ph B" if "Ph B" in filtered_df.columns else filtered_df.columns[5]
                    col_c = "กระแส C" if "กระแส C" in filtered_df.columns else "Ph C" if "Ph C" in filtered_df.columns else filtered_df.columns[6]
                    
                    if exclude_total:
                        filtered_df = filtered_df[filtered_df[col_feeder].astype(str).str.strip() != "รวม"]
                        
                    if min_amp > 0 or max_amp < 250:
                        a_vals = pd.to_numeric(filtered_df[col_a], errors='coerce').fillna(0)
                        b_vals = pd.to_numeric(filtered_df[col_b], errors='coerce').fillna(0)
                        c_vals = pd.to_numeric(filtered_df[col_c], errors='coerce').fillna(0)
                        
                        mask_a = (a_vals >= min_amp) & (a_vals <= max_amp)
                        mask_b = (b_vals >= min_amp) & (b_vals <= max_amp)
                        mask_c = (c_vals >= min_amp) & (c_vals <= max_amp)
                        
                        filtered_df = filtered_df[mask_a | mask_b | mask_c]

                        
                    def compute_status(row):
                        try:
                            pea = str(row['PEA NO'])
                            master_row = df_master[df_master['PEANO หม้อแปลง'].astype(str) == pea]
                            if master_row.empty: return "⚪ ข้อมูล Master ไม่ครบ"
                            # กำจัดลูกน้ำก่อนแปลง และป้องกัน division by zero
                            kva_raw = master_row.iloc[0].get('ค่าพิกัด kVA หม้อแปลง', 0)
                            kva_clean = str(kva_raw).replace(',', '').strip()
                            kva_val = float(kva_clean) if kva_clean.replace('.', '', 1).isdigit() else 0.0
                            if kva_val == 0:
                                raise ValueError("Invalid kVA")
                            
                            col_a = "กระแส A" if "กระแส A" in row else "Ph A" if "Ph A" in row else row.keys()[4]
                            col_b = "กระแส B" if "กระแส B" in row else "Ph B" if "Ph B" in row else row.keys()[5]
                            col_c = "กระแส C" if "กระแส C" in row else "Ph C" if "Ph C" in row else row.keys()[6]
                            
                            def safe_float(val):
                                try:
                                    if pd.isna(val) or str(val).strip() == "": return 0.0
                                    return float(val)
                                except (ValueError, TypeError):
                                    return 0.0
                            
                            a = safe_float(row.get(col_a, 0))
                            b = safe_float(row.get(col_b, 0))
                            c = safe_float(row.get(col_c, 0))
                            
                            i_max = (kva_val * 1000) / (math.sqrt(3) * 400)
                            max_i = max(a, b, c)
                            pct_load = (max_i / i_max) * 100 if i_max > 0 else 0
                            
                            avg_i = (a + b + c) / 3
                            pct_unb = 0
                            if avg_i > 0:
                                max_dev = max(abs(a - avg_i), abs(b - avg_i), abs(c - avg_i))
                                pct_unb = (max_dev / avg_i) * 100
                            
                            alerts = []
                            if pct_load > 100: alerts.append("🔴 Overload")
                            elif pct_load > 80: alerts.append("🟡 ใกล้เกินพิกัด")
                            
                            if pct_unb > 30: alerts.append("🔴 Unbalance")
                            elif pct_unb > 20: alerts.append("🟡 Unbalance")
                            
                            if alerts: return ", ".join(alerts)
                            return "🟢 ปกติ"
                        except:
                            return "⚪ คำนวณไม่ได้"

                    with st.spinner("กำลังประมวลผลข้อมูล..."):
                        filtered_df['Status'] = filtered_df.apply(compute_status, axis=1)
                        
                        if status_filter != "ทั้งหมด":
                            filtered_df = filtered_df[filtered_df['Status'].str.contains(status_filter)]
                            
                        # --- [เพิ่มใหม่] เรียงลำดับข้อมูลให้ล่าสุดอยู่บนสุด ---
                        if not filtered_df.empty:
                            col_date_f = "วันที่" if "วันที่" in filtered_df.columns else filtered_df.columns[0]
                            col_time_f = "เวลา" if "เวลา" in filtered_df.columns else filtered_df.columns[1]
                            
                            # เก็บ Index เดิมไว้ เพื่อไม่ให้ลำดับฟีดเดอร์ (F1, F2, F3, รวม) สลับกันเอง
                            filtered_df['Original_Index'] = filtered_df.index
                            # สร้างคอลัมน์ชั่วคราวสำหรับเรียงลำดับเวลา
                            filtered_df['Datetime_Sort'] = pd.to_datetime(
                                filtered_df[col_date_f].astype(str) + ' ' + filtered_df[col_time_f].astype(str), 
                                format='%d/%m/%Y %H:%M:%S', 
                                errors='coerce'
                            )
                            # สั่งเรียงเวลาจากล่าสุดไปเก่า (False) และเรียงฟีดเดอร์ตามลำดับเดิม (True)
                            filtered_df = filtered_df.sort_values(by=['Datetime_Sort', 'Original_Index'], ascending=[False, True])
                            # ลบคอลัมน์ชั่วคราวทิ้ง
                            filtered_df = filtered_df.drop(columns=['Datetime_Sort', 'Original_Index'])
                        # ----------------------------------------------------
                            
                        st.markdown(f"**แสดงผลลัพธ์: {len(filtered_df)} รายการ**")
                        st.caption("💡 คลิกที่เลข PEA NO (ตัวอักษรสีน้ำเงิน) เพื่อดูประวัติหม้อแปลงเครื่องนั้นได้ทันที")
                        
                        if len(filtered_df) > 0:
                            # สร้าง HTML Table พร้อม PEA NO เป็นลิงก์คลิกได้
                            th_s = "background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:12px 8px;text-align:center;font-weight:600;font-size:0.78rem;white-space:nowrap;"
                            td_s = "padding:10px 8px;text-align:center;border-bottom:1px solid #e9ecef;color:#333;font-size:0.82rem;"
                            
                            col_date_f = "วันที่" if "วันที่" in filtered_df.columns else filtered_df.columns[0]
                            col_time_f = "เวลา" if "เวลา" in filtered_df.columns else filtered_df.columns[1]
                            col_feeder_f = "ฟิดเดอร์" if "ฟิดเดอร์" in filtered_df.columns else "Feeder" if "Feeder" in filtered_df.columns else filtered_df.columns[3]
                            col_a_f = "กระแส A" if "กระแส A" in filtered_df.columns else "Ph A" if "Ph A" in filtered_df.columns else filtered_df.columns[4]
                            col_b_f = "กระแส B" if "กระแส B" in filtered_df.columns else "Ph B" if "Ph B" in filtered_df.columns else filtered_df.columns[5]
                            col_c_f = "กระแส C" if "กระแส C" in filtered_df.columns else "Ph C" if "Ph C" in filtered_df.columns else filtered_df.columns[6]
                            col_n_f = "กระแส N" if "กระแส N" in filtered_df.columns else "N" if "N" in filtered_df.columns else filtered_df.columns[7] if len(filtered_df.columns) > 7 else ""
                            col_note_f = "หมายเหตุ" if "หมายเหตุ" in filtered_df.columns else "Note" if "Note" in filtered_df.columns else filtered_df.columns[8] if len(filtered_df.columns) > 8 else ""
                            
                            # สลับสีตามกลุ่ม PEA NO
                            group_colors = ["#f0f7ff", "#fff8f0"]
                            group_idx = 0
                            prev_pea = None
                            
                            rows_f = ""
                            for i, (_, row) in enumerate(filtered_df.iterrows()):
                                pea_val = str(row.get('PEA NO', '-'))
                                if pea_val != prev_pea:
                                    group_idx += 1
                                    prev_pea = pea_val
                                
                                bg = group_colors[group_idx % 2]
                                border_accent = "#2575fc" if group_idx % 2 == 1 else "#e94560"
                                pea_link = f"<a href='?profile_pea={pea_val}' target='_self' style='color:#2575fc;font-weight:700;text-decoration:none;border-bottom:2px dashed #2575fc;padding-bottom:1px;'>{pea_val}</a>"
                                
                                # Status badge
                                status_val = str(row.get('Status', ''))
                                if 'Overload' in status_val or '🔴' in status_val:
                                    status_badge = f"<span style='background:#f8d7da;color:#842029;padding:3px 8px;border-radius:12px;font-size:0.72rem;white-space:nowrap;'>{status_val}</span>"
                                elif '🟡' in status_val:
                                    status_badge = f"<span style='background:#fff3cd;color:#664d03;padding:3px 8px;border-radius:12px;font-size:0.72rem;white-space:nowrap;'>{status_val}</span>"
                                elif 'ปกติ' in status_val or '🟢' in status_val:
                                    status_badge = f"<span style='background:#d1e7dd;color:#0f5132;padding:3px 8px;border-radius:12px;font-size:0.72rem;white-space:nowrap;'>{status_val}</span>"
                                else:
                                    status_badge = f"<span style='background:#e2e3e5;color:#41464b;padding:3px 8px;border-radius:12px;font-size:0.72rem;white-space:nowrap;'>{status_val}</span>"
                                
                                rows_f += f"<tr style='background:{bg};' onmouseover=\"this.style.background='#e8f0fe'\" onmouseout=\"this.style.background='{bg}'\">"
                                rows_f += f"<td style='{td_s}border-left:4px solid {border_accent};'>{row.get(col_date_f, '-')}</td>"
                                rows_f += f"<td style='{td_s}'>{row.get(col_time_f, '-')}</td>"
                                rows_f += f"<td style='{td_s}'>{pea_link}</td>"
                                rows_f += f"<td style='{td_s}'>{row.get(col_feeder_f, '-')}</td>"
                                rows_f += f"<td style='{td_s}font-weight:600;'>{row.get(col_a_f, '-')}</td>"
                                rows_f += f"<td style='{td_s}font-weight:600;'>{row.get(col_b_f, '-')}</td>"
                                rows_f += f"<td style='{td_s}font-weight:600;'>{row.get(col_c_f, '-')}</td>"
                                rows_f += f"<td style='{td_s}'>{row.get(col_n_f, '-') if col_n_f else '-'}</td>"
                                rows_f += f"<td style='{td_s}text-align:left;font-size:0.75rem;color:#6c757d;'>{row.get(col_note_f, '') if col_note_f else ''}</td>"
                                rows_f += f"<td style='{td_s}'>{status_badge}</td>"
                                rows_f += "</tr>"
                            
                            filter_table = f"""<div style="border-radius:10px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="{th_s}">📅 วันที่</th><th style="{th_s}">🕐 เวลา</th><th style="{th_s}">🔗 PEA NO</th><th style="{th_s}">🔌 ฟีดเดอร์</th><th style="{th_s}">A</th><th style="{th_s}">B</th><th style="{th_s}">C</th><th style="{th_s}">N</th><th style="{th_s}">📝 หมายเหตุ</th><th style="{th_s}">⚡ Status</th></tr></thead><tbody>{rows_f}</tbody></table></div>"""
                            
                            st.markdown(filter_table, unsafe_allow_html=True)
                        # Chart if PEA is selected
                        if selected_pea != "ทั้งหมด" and len(filtered_df) > 0:
                            st.markdown('<div class="section-card">', unsafe_allow_html=True)
                            st.markdown(f"**📈 กราฟแนวโน้มกระแส (A, B, C) ของ PEA {selected_pea}**")
                            
                            col_a = "กระแส A" if "กระแส A" in filtered_df.columns else "Ph A" if "Ph A" in filtered_df.columns else filtered_df.columns[4]
                            col_b = "กระแส B" if "กระแส B" in filtered_df.columns else "Ph B" if "Ph B" in filtered_df.columns else filtered_df.columns[5]
                            col_c = "กระแส C" if "กระแส C" in filtered_df.columns else "Ph C" if "Ph C" in filtered_df.columns else filtered_df.columns[6]
                            col_feeder = "ฟิดเดอร์" if "ฟิดเดอร์" in filtered_df.columns else "Feeder" if "Feeder" in filtered_df.columns else filtered_df.columns[3]
                            col_time = "เวลา" if "เวลา" in filtered_df.columns else filtered_df.columns[1]
                            
                            chart_data = filtered_df.copy()
                            chart_data['Label'] = chart_data[col_date].astype(str) + " " + chart_data[col_time].astype(str) + " (" + chart_data[col_feeder].astype(str) + ")"
                            chart_data = chart_data.set_index('Label')
                            chart_data = chart_data[[col_a, col_b, col_c]].apply(pd.to_numeric, errors='coerce')
                            
                            st.line_chart(chart_data)
                            st.markdown('</div>', unsafe_allow_html=True)
                            
                        # Export Button
                        st.markdown("<br>", unsafe_allow_html=True)
                        csv_data = convert_df_to_csv(filtered_df)
                        st.download_button(
                            label="📥 ดาวน์โหลดข้อมูล (CSV)",
                            data=csv_data,
                            file_name=f"transformer_data_{datetime.datetime.now().strftime('%Y%m%d')}.csv",
                            mime="text/csv",
                            use_container_width=True
                        )
            
            # ==============================
            # หน้าที่ 5: PROFILE PAGE
            # ==============================
            elif st.session_state.page == "Profile":
                st.markdown("""
                <div style="background: linear-gradient(135deg, #6a11cb, #2575fc); padding: 15px; border-radius: 10px; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="margin:0; color:white;">📋 ค้นหาประวัติหม้อแปลงไฟฟ้า (Transformer Profile)</h4>
                </div>
                """, unsafe_allow_html=True)
                
                default_pea = ""
                if 'selected_pea_for_profile' in st.session_state and st.session_state.selected_pea_for_profile:
                    default_pea = st.session_state.selected_pea_for_profile
                
                col_s1, col_s2 = st.columns([3, 1])
                with col_s1:
                    search_pea = st.text_input("🔍 กรอกรหัส PEA No. เพื่อค้นหา...", value=default_pea, placeholder="เช่น 59-5554")
                with col_s2:
                    st.markdown("<div style='margin-top: 28px;'></div>", unsafe_allow_html=True)
                    if default_pea:
                        if st.button("⬅️ ย้อนกลับ", use_container_width=True):
                            st.session_state.page = "Filter"
                            st.session_state.selected_pea_for_profile = None
                            st.rerun()
                
                if search_pea:
                    search_pea = search_pea.strip()
                    master_row = df_master[df_master['PEANO หม้อแปลง'].astype(str) == search_pea]
                    
                    if master_row.empty:
                        st.warning(f"⚠️ ไม่พบประวัติหม้อแปลงรหัส {search_pea} ในระบบ (Master Data)")
                    else:
                        m_data = master_row.iloc[0]
                        kva = m_data.get('ค่าพิกัด kVA หม้อแปลง', '-')
                        loc = m_data.get('สถานที่', '-')
                        lat = m_data.get('LATITUDE', '-')
                        lng = m_data.get('LONGITUDE', '-')
                        
                        if not df_record.empty and 'PEA NO' in df_record.columns:
                            hist_df = df_record[df_record['PEA NO'].astype(str) == search_pea]
                        else:
                            hist_df = pd.DataFrame()
                            
                        unique_sessions = 0
                        if not hist_df.empty:
                            col_date = "วันที่" if "วันที่" in hist_df.columns else hist_df.columns[0]
                            col_time = "เวลา" if "เวลา" in hist_df.columns else hist_df.columns[1]
                            unique_sessions = len(hist_df.drop_duplicates(subset=[col_date, col_time]))
                        
                        st.markdown("""
                        <div style="background: #198754; padding: 10px 15px; border-radius: 8px 8px 0 0; color: white; font-weight: bold;">
                            📂 ข้อมูลโปรไฟล์และประวัติการวัดโหลดที่ผ่านมา
                        </div>
                        """, unsafe_allow_html=True)
                        
                        st.markdown(f"""
                        <div style="background: white; border: 1px solid #dee2e6; border-top: none; padding: 20px; border-radius: 0 0 8px 8px; color: #333; margin-bottom: 20px;">
                            <h5 style="color: #198754; margin-top: 0;">🟢 พบประวัติหม้อแปลงในระบบ</h5>
                            <div style="display:flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; margin-top: 15px;">
                                <div>
                                    <span style="color: #6c757d;">PEA No:</span> <b>{search_pea}</b><br>
                                    <span style="color: #6c757d;">ขนาด:</span> {kva} kVA
                                </div>
                                <div>
                                    <span style="color: #6c757d;">สถานที่ติดตั้ง:</span> {loc}<br>
                                    <span style="color: #6c757d;">พิกัด (Lat, Lng):</span> {lat}, {lng}
                                </div>
                                <div>
                                    <span style="color: #6c757d;">ตรวจวัดมาแล้ว:</span> <b>{unique_sessions}</b> ครั้ง
                                </div>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        if not hist_df.empty:
                            st.markdown("##### 📑 ประวัติบันทึกข้อมูลโหลด:")
                            
                            # สร้างตาราง HTML สวยงาม แบ่งสีตามรอบการวัด
                            col_date = "วันที่" if "วันที่" in hist_df.columns else hist_df.columns[0]
                            col_time = "เวลา" if "เวลา" in hist_df.columns else hist_df.columns[1]
                            col_feeder = "ฟิดเดอร์" if "ฟิดเดอร์" in hist_df.columns else "Feeder" if "Feeder" in hist_df.columns else hist_df.columns[3]
                            col_a_h = "กระแส A" if "กระแส A" in hist_df.columns else "Ph A" if "Ph A" in hist_df.columns else hist_df.columns[4]
                            col_b_h = "กระแส B" if "กระแส B" in hist_df.columns else "Ph B" if "Ph B" in hist_df.columns else hist_df.columns[5]
                            col_c_h = "กระแส C" if "กระแส C" in hist_df.columns else "Ph C" if "Ph C" in hist_df.columns else hist_df.columns[6]
                            col_n_h = "กระแส N" if "กระแส N" in hist_df.columns else "N" if "N" in hist_df.columns else hist_df.columns[7] if len(hist_df.columns) > 7 else ""
                            col_note_h = "หมายเหตุ" if "หมายเหตุ" in hist_df.columns else "Note" if "Note" in hist_df.columns else hist_df.columns[8] if len(hist_df.columns) > 8 else ""
                            
                            session_colors = ["#f0f7ff", "#fff8f0"]
                            session_idx = 0
                            prev_session = None
                            
                            th_style = "background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:10px 12px;text-align:center;font-weight:600;font-size:0.8rem;"
                            td_style = "padding:8px 12px;text-align:center;border-bottom:1px solid #e9ecef;color:#333;font-size:0.85rem;"
                            
                            rows_html = ""
                            for _, row in hist_df.iterrows():
                                current_session = f"{row.get(col_date, '')}-{row.get(col_time, '')}"
                                if current_session != prev_session:
                                    session_idx += 1
                                    prev_session = current_session
                                
                                bg = session_colors[session_idx % 2]
                                feeder_val = str(row.get(col_feeder, '-'))
                                is_total = feeder_val.strip() == "รวม"
                                
                                a_val = row.get(col_a_h, '-')
                                b_val = row.get(col_b_h, '-')
                                c_val = row.get(col_c_h, '-')
                                n_val = row.get(col_n_h, '-') if col_n_h else '-'
                                note_val = row.get(col_note_h, '') if col_note_h else ''
                                
                                if is_total:
                                    td_total = td_style + "font-weight:700;border-bottom:3px solid #adb5bd;"
                                    feeder_display = f"<b style='color:#e94560;'>⚡ {feeder_val}</b>"
                                    rows_html += f"<tr style='background:{bg};'><td style='{td_total}'>{row.get(col_date, '-')}</td><td style='{td_total}'>{row.get(col_time, '-')}</td><td style='{td_total}'>{feeder_display}</td><td style='{td_total}'>{a_val}</td><td style='{td_total}'>{b_val}</td><td style='{td_total}'>{c_val}</td><td style='{td_total}'>{n_val}</td><td style='{td_total}text-align:left;color:#6c757d;'>{note_val}</td></tr>"
                                else:
                                    rows_html += f"<tr style='background:{bg};'><td style='{td_style}'>{row.get(col_date, '-')}</td><td style='{td_style}'>{row.get(col_time, '-')}</td><td style='{td_style}'>{feeder_val}</td><td style='{td_style}'>{a_val}</td><td style='{td_style}'>{b_val}</td><td style='{td_style}'>{c_val}</td><td style='{td_style}'>{n_val}</td><td style='{td_style}text-align:left;color:#6c757d;'>{note_val}</td></tr>"
                            
                            full_html = f"""<div style="border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="{th_style}">📅 วันที่</th><th style="{th_style}">🕐 เวลา</th><th style="{th_style}">🔌 ฟีดเดอร์</th><th style="{th_style}">กระแส A</th><th style="{th_style}">กระแส B</th><th style="{th_style}">กระแส C</th><th style="{th_style}">กระแส N</th><th style="{th_style}">📝 หมายเหตุ</th></tr></thead><tbody>{rows_html}</tbody></table></div>"""
                            
                            st.markdown(full_html, unsafe_allow_html=True)
                            st.markdown("<br>", unsafe_allow_html=True)
                            
                            # --- Smart Alerts (ดึงจากฟังก์ชันกลาง) ---
                            try:
                                pct_load, pct_unb = calculate_transformer_status(df_master, df_record, search_pea)
                                if pct_load is not None and pct_unb is not None:
                                    alerts = []
                                    if pct_unb > 30:
                                        alerts.append(f"<li>🚨 <b>Severe Unbalance:</b> ความไม่สมดุลขั้นวิกฤต ({pct_unb:.2f}%) อาจทำให้เกิดความร้อนสะสมและแรงดันตกหล่นรุนแรง</li>")
                                    elif pct_unb > 20:
                                        alerts.append(f"<li>⚠️ <b>Warning Unbalance:</b> ความไม่สมดุล ({pct_unb:.2f}%) ควรเฝ้าระวัง</li>")
                                        
                                    if pct_load > 100:
                                        alerts.append(f"<li>🚨 <b>Overload:</b> โหลดเกินพิกัด ({pct_load:.2f}%) เสี่ยงต่อหม้อแปลงชำรุดหรือระเบิด</li>")
                                    elif pct_load > 80:
                                        alerts.append(f"<li>⚠️ <b>High Load:</b> โหลดสูง ({pct_load:.2f}%) เข้าใกล้ขีดจำกัด</li>")
                                        
                                    if alerts:
                                        alert_html = f"""
                                        <div style="background-color: #f8d7da; color: #842029; border: 1px solid #f5c2c7; padding: 15px; border-radius: 8px; margin-top: 15px;">
                                            <h6 style="margin-top: 0; color: #842029;">🤖 ระบบวิเคราะห์อัตโนมัติ (Smart Alerts):</h6>
                                            <ul style="margin-bottom: 0;">
                                                {"".join(alerts)}
                                            </ul>
                                        </div>
                                        """
                                        st.markdown(alert_html, unsafe_allow_html=True)
                            except Exception as e:
                                pass
                                
                        else:
                            st.info("ยังไม่มีประวัติการวัดโหลดสำหรับหม้อแปลงเครื่องนี้ในระบบ")
                            
                        st.markdown("<br>", unsafe_allow_html=True)
                        # --- [เพิ่มใหม่] ⚙️ จัดการข้อมูลย้อนหลัง (Edit / Delete) ---
                        if not hist_df.empty:
                            st.markdown("<br>", unsafe_allow_html=True)
                            with st.expander("⚙️ จัดการข้อมูลที่บันทึกไปแล้ว (แก้ไข / ลบ)"):
                                col_date = "วันที่" if "วันที่" in hist_df.columns else hist_df.columns[0]
                                col_time = "เวลา" if "เวลา" in hist_df.columns else hist_df.columns[1]
                                
                                session_list = hist_df[[col_date, col_time]].drop_duplicates().apply(lambda row: f"{row[col_date]} เวลา {row[col_time]}", axis=1).tolist()
                                selected_session = st.selectbox("เลือกรอบการบันทึกที่ต้องการจัดการ:", options=["-- กรุณาเลือก --"] + session_list)
                                
                                if selected_session != "-- กรุณาเลือก --":
                                    sel_date = selected_session.split(" เวลา ")[0]
                                    sel_time = selected_session.split(" เวลา ")[1]
                                    
                                    c_edit, c_del = st.columns(2)
                                    with c_del:
                                        if st.button("🗑️ ลบข้อมูลรอบนี้", type="primary", use_container_width=True):
                                            with st.spinner("กำลังลบข้อมูล..."):
                                                if delete_record_session(client, SHEET_NAME, search_pea, sel_date, sel_time):
                                                    st.success("ลบข้อมูลเรียบร้อยแล้ว!")
                                                    st.rerun()
                                    with c_edit:
                                        if st.button("✏️ ดึงข้อมูลไปแก้ไข", use_container_width=True):
                                            st.session_state.edit_mode = True
                                            st.session_state.edit_pea = search_pea
                                            st.session_state.edit_date = sel_date
                                            st.session_state.edit_time = sel_time
                                            st.session_state.page = "Form"
                                            st.rerun()
                        # -----------------------------------------------
                        col_btn1, col_btn2, col_btn3 = st.columns(3)
                        with col_btn1:
                            if st.button("🩺 บันทึกการตรวจวัดโหลดรอบใหม่", type="primary", use_container_width=True):
                                st.session_state.page = "Form"
                                st.session_state.selected_pea_from_map = search_pea
                                st.rerun()
                        with col_btn2:
                            is_pending = False
                            if not df_task.empty and 'PEA NO' in df_task.columns:
                                task_rows = df_task[df_task['PEA NO'].astype(str) == search_pea]
                                if not task_rows.empty and str(task_rows.iloc[-1].get('Status', '')).strip() == 'Pending':
                                    is_pending = True
                            
                            if is_pending:
                                st.button("✅ สั่งงานตรวจสอบซ้ำแล้ว", disabled=True, use_container_width=True)
                            else:
                                if st.button("🚩 Add งาน (สั่งตรวจสอบซ้ำ)", use_container_width=True):
                                    with st.spinner("กำลังบันทึกสั่งงาน..."):
                                        if add_task_to_sheet(client, SHEET_NAME, search_pea):
                                            st.success("บันทึกคำสั่งงานเรียบร้อยแล้ว หมุดบนแผนที่จะกลายเป็นสีส้ม!")
                                            st.rerun()
                        @st.dialog("⚠️ ยืนยันการลบข้อมูล")
                        def confirm_delete_dialog(pea_no):
                            st.error(f"คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลหม้อแปลง **PEA {pea_no}** ออกจากระบบ?\n\n**หมายเหตุ:** การกระทำนี้ไม่สามารถย้อนกลับได้!")
                            st.markdown("<br>", unsafe_allow_html=True)
                            col_y, col_n = st.columns(2)
                            with col_y:
                                if st.button("✔️ ยืนยัน (ลบ)", type="primary", use_container_width=True):
                                    with st.spinner("กำลังลบข้อมูลจาก MasterData และประวัติที่เกี่ยวข้องทั้งหมด..."):
                                        if delete_transformer_from_all_sheets(client, SHEET_NAME, pea_no):
                                            st.success(f"ลบข้อมูลหม้อแปลง {pea_no} สำเร็จ!")
                                            st.session_state.selected_pea_for_profile = None
                                            st.rerun()
                            with col_n:
                                if st.button("❌ ยกเลิก", use_container_width=True):
                                    st.rerun()

                        with col_btn3:
                            if st.button("🗑️ ลบข้อมูลหม้อแปลงนี้", use_container_width=True):
                                confirm_delete_dialog(search_pea)
                            
            # ==============================
            # หน้าที่ 6: REGISTER PAGE
            # ==============================
            elif st.session_state.page == "Register":
                st.markdown("""
                <div style="background: linear-gradient(135deg, #11998e, #38ef7d); padding: 15px; border-radius: 10px; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="margin:0; color:white;">➕ ลงทะเบียนหม้อแปลงใหม่</h4>
                </div>
                """, unsafe_allow_html=True)
                
                st.info("💡 ข้อมูลทุกช่องไม่จำเป็นต้องกรอก (Optional) สามารถเว้นว่างไว้ได้ครับ")
                
                with st.form("register_transformer_form"):
                    reg_pea = st.text_input("PEANO หม้อแปลง (รหัส กฟภ.)", placeholder="เช่น 59-5554")
                    reg_kva = st.text_input("ค่าพิกัด kVA หม้อแปลง", placeholder="เช่น 50, 100, 160")
                    reg_loc = st.text_input("สถานที่ติดตั้ง", placeholder="เช่น บ้านหนองหอย ม.3")
                    
                    col1, col2 = st.columns(2)
                    with col1:
                        reg_lat = st.text_input("พิกัด LATITUDE", placeholder="เช่น 18.788")
                    with col2:
                        reg_lng = st.text_input("พิกัด LONGITUDE", placeholder="เช่น 98.985")
                        
                    reg_phase = st.text_input("ระบบเฟส", placeholder="เช่น 1 เฟส, 3 เฟส")
                    
                    submitted = st.form_submit_button("💾 บันทึกข้อมูลหม้อแปลง", type="primary", use_container_width=True)
                    
                    if submitted:
                        if not reg_pea.strip():
                            st.warning("⚠️ กรุณากรอกรหัส PEANO หม้อแปลง")
                        elif reg_pea.strip() in df_master['PEANO หม้อแปลง'].astype(str).str.strip().values:
                            st.error(f"❌ มีรหัส PEA {reg_pea} อยู่ในระบบแล้วครับ ไม่สามารถลงทะเบียนซ้ำได้")
                        else:
                            with st.spinner("กำลังบันทึกข้อมูลลงฐานข้อมูลหลัก (MasterData)..."):
                                new_row = []
                                for col in df_master.columns:
                                    col_str = str(col).strip()
                                    if col_str == "PEANO หม้อแปลง":
                                        new_row.append(reg_pea)
                                    elif col_str == "ค่าพิกัด kVA หม้อแปลง":
                                        new_row.append(reg_kva)
                                    elif col_str == "สถานที่":
                                        new_row.append(reg_loc)
                                    elif col_str == "LATITUDE":
                                        new_row.append(reg_lat)
                                    elif col_str == "LONGITUDE":
                                        new_row.append(reg_lng)
                                    elif col_str == "ระบบเฟส":
                                        new_row.append(reg_phase)
                                    else:
                                        new_row.append("")
                                    
                            if add_master_data_to_sheet(client, SHEET_NAME, new_row):
                                st.success(f"🎉 ลงทะเบียนหม้อแปลงสำเร็จแล้ว!")
                                st.rerun()

        else:
            st.error("ข้อผิดพลาด: ชื่อหัวคอลัมน์ (บรรทัดแรกสุด) ในชีต MasterData ไม่ตรงกับที่ระบบต้องการครับ")
            st.warning(f"📌 คอลัมน์ที่ระบบต้องการคือ: {required_cols}")
            st.info(f"📄 คอลัมน์ที่มีอยู่ในชีตของคุณตอนนี้คือ: {df_master.columns.tolist()}")
            st.write("วิธีแก้: รบกวนเปลี่ยนชื่อหัวคอลัมน์ใน Google Sheets ให้ตรงกับที่ระบบต้องการ (ระวังเรื่องการเว้นวรรค) หรือพิมพ์บอกผมว่าคุณใช้ชื่อคอลัมน์ว่าอะไร เพื่อให้ผมแก้โค้ดให้ตรงกันครับ")
