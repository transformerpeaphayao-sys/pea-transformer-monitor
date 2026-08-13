import re

with open('core.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_css = '''def load_custom_css():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap');
    
    /* ===== 1. CSS Variables (Modern SaaS Palette) ===== */
    :root {
        --app-bg: #f4f7fe;         /* พื้นหลังแอปสีเทาฟ้าอ่อนมาก */
        --card-bg: #ffffff;        /* พื้นหลังกล่องสีขาวล้วน */
        --primary-indigo: #4318FF; /* สีม่วงอมน้ำเงินตามภาพแบบเป๊ะๆ */
        --primary-light: #e9e3ff;
        
        --text-dark: #2b3674;      /* สีตัวหนังสือหลัก เข้มแต่ไม่ดำสนิท */
        --text-gray: #a3aed1;      /* สีหัวตารางและ Label อ่อนๆ */
        
        --border-soft: #f4f7fe;    /* เส้นขอบจางๆ */
        --shadow-soft: 0px 18px 40px rgba(112, 144, 176, 0.12); /* เงาฟุ้งๆ นุ่มๆ แบบในภาพ */
        
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
    
    /* ===== Sidebar ===== */
    [data-testid="stSidebar"] {
        background-color: var(--card-bg) !important;
        border-right: none !important; /* เอาเส้นขอบออกให้ดูโปร่ง */
        box-shadow: 2px 0px 20px rgba(112, 144, 176, 0.08);
    }
    [data-testid="stSidebar"] button[kind="secondary"],
    [data-testid="stSidebar"] button[kind="primary"] {
        background-color: transparent !important;
        border: none !important;
        color: var(--text-gray) !important;
        font-weight: 500 !important;
        padding: 0.8rem 1rem !important;
        border-radius: 8px !important;
        transition: all 0.2s ease !important;
    }
    [data-testid="stSidebar"] button:hover {
        background-color: var(--app-bg) !important;
        color: var(--primary-indigo) !important;
        transform: translateX(4px);
    }

    /* ===== Metric Cards (ถอดแบบจากรูปภาพ) ===== */
    .metric-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .metric-card {
        flex: 1 1 180px;
        background: var(--card-bg);
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: var(--shadow-soft);
        display: flex;
        flex-direction: column;
        justify-content: center;
        border: none;
    }
    .metric-card .label { 
        font-size: 0.8rem; 
        font-weight: 600; 
        color: var(--text-gray); 
        text-transform: uppercase; /* ทำตัวพิมพ์ใหญ่ */
        letter-spacing: 0.5px;    /* ถ่างช่องไฟ */
        margin-bottom: 8px;
    }
    .metric-card .value { 
        font-size: 2.2rem; 
        font-weight: 700; 
        color: var(--text-dark); 
        line-height: 1; 
    }
    
    /* ===== Buttons ===== */
    button[kind="primary"] {
        background: var(--primary-indigo) !important; 
        color: white !important;
        border-radius: 10px !important;
        font-weight: 500 !important;
        padding: 0.5rem 1.5rem !important;
        box-shadow: 0px 4px 10px rgba(67, 24, 255, 0.2) !important;
        border: none !important;
    }
    button[kind="primary"]:hover { background: #3311db !important; }
    
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
        color: var(--text-dark) !important;
        border-bottom: 3px solid var(--primary-indigo) !important;
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
        min-width: 1100px;
    }
    /* หัวตาราง ไม่มีพื้นหลัง ตัวอักษรสีเทา */
    .pea-table th {
        background-color: transparent !important;
        color: var(--text-gray) !important;
        padding: 16px 10px !important;
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        text-transform: uppercase;
        border-bottom: 1px solid #e2e8f0 !important;
        white-space: nowrap !important;
        text-align: left !important; /* จัดซ้ายดูโมเดิร์นกว่า */
    }
    /* คอลัมน์ข้อมูล */
    .pea-table td {
        padding: 16px 10px !important;
        border-bottom: 1px dashed #e2e8f0 !important; /* เส้นคั่นแบบประจางๆ */
        color: var(--text-dark) !important;
        font-size: 0.9rem !important;
        vertical-align: middle !important;
        text-align: left !important;
    }
    .pea-table tr:last-child td { border-bottom: none !important; }
    
    /* ตัดสีพื้นหลังสลับบรรทัดทิ้ง ให้เป็นสีขาวล้วนแบบในรูป */
    .pea-table tr.group-odd td, .pea-table tr.group-even td, .pea-table td.grouped-cell { 
        background-color: transparent !important; 
        border-right: none !important; /* เอาเส้นตั้งออก */
    }
    .pea-table tr:hover td { background-color: #f8fafc !important; }

    /* Alignment Classes */
    .pea-table th.num-cell, .pea-table td.num-cell {
        text-align: right !important;
        padding-right: 20px !important;
        font-family: 'Inter', sans-serif !important; /* ใช้ Inter กับตัวเลขจะสวยมาก */
    }
    </style>
    """, unsafe_allow_html=True)'''

# Using regex to replace the function definition block.
pattern = re.compile(r'def load_custom_css\(\):.*?""", unsafe_allow_html=True\)', re.DOTALL)
new_content = re.sub(pattern, new_css, content)

with open('core.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("CSS Updated Successfully!")
