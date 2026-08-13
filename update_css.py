import re

with open('core.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CSS Variables
new_vars = '''    /* ===== 1. CSS Variables (PEA Enterprise Theme) ===== */
    :root {
        --app-bg: #f5f7fa;         
        --card-bg: #ffffff;        
        --primary-pea: #822485;    /* สีม่วง PEA เข้มแบบในรูป */
        --primary-light: #f5ebf6;
        --secondary-yellow: #fbc02d; /* สีเหลืองสำหรับปุ่ม/เน้น */
        --danger-red: #e74c3c;
        
        --text-dark: #333333;      
        --text-gray: #7f8c8d;      
        
        --border-soft: #e0e0e0;    
        --shadow-soft: 0px 4px 12px rgba(0, 0, 0, 0.05); 
        
        /* Status Colors */
        --badge-red-bg: #fff0f0; --badge-red-text: #e11d48;
        --badge-yellow-bg: #fff8eb; --badge-yellow-text: #d97706;
        --badge-green-bg: #ebfef4; --badge-green-text: #059669;
    }'''
content = re.sub(r'/\* ===== 1\. CSS Variables.*?\n    }', new_vars, content, flags=re.DOTALL)

# 2. Update Sidebar
new_sidebar = '''    /* ===== Sidebar ===== */
    [data-testid="stSidebar"] {
        background-color: var(--primary-pea) !important;
        border-right: none !important;
        box-shadow: 2px 0px 10px rgba(0,0,0,0.1);
    }
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h1,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h2,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3 {
        color: #ffffff !important;
    }
    [data-testid="stSidebar"] button[kind="secondary"],
    [data-testid="stSidebar"] button[kind="primary"] {
        background-color: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.8) !important;
        font-weight: 500 !important;
        padding: 0.8rem 1rem !important;
        border-radius: 4px !important;
        transition: all 0.2s ease !important;
    }
    [data-testid="stSidebar"] button:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
        color: var(--secondary-yellow) !important;
        transform: translateX(4px);
    }
    [data-testid="stSidebar"] hr { border-color: rgba(255,255,255,0.1); }'''
content = re.sub(r'/\* ===== Sidebar ===== \*/.*?transform: translateX\(4px\);\n    }', new_sidebar, content, flags=re.DOTALL)

# 3. Update Buttons and add Section Header style
new_buttons = '''    /* ===== Buttons ===== */
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
        background-color: var(--primary-pea);
        color: white;
        padding: 10px 15px;
        font-weight: 500;
        border-radius: 4px 4px 0 0;
        margin: -1.5rem -1.5rem 1.5rem -1.5rem; /* pull to edges of section-card */
        font-size: 1rem;
    }'''
content = re.sub(r'/\* ===== Buttons ===== \*/.*?button\[kind="primary"\]:hover \{ background: #3311db !important; \}', new_buttons, content, flags=re.DOTALL)

with open('core.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("CSS Updated")
