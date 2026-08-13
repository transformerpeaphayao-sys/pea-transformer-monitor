def load_custom_css():
    st.markdown("""
    <style>
    /* ===== Google Fonts ===== */
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
    
    /* ===== Global (Clean Enterprise Look) ===== */
    html, body, [class*="css"] {
        font-family: 'Prompt', sans-serif !important;
        background-color: #f4f6f9 !important; /* พื้นหลังสีเทาอ่อนสบายตา */
        color: #333333 !important;
    }
    
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    .block-container {
        padding-top: 2.5rem !important;
        padding-bottom: 2rem !important;
        max-width: 95% !important;
    }
    
    /* ===== Sidebar (PEA Corporate Style) ===== */
    [data-testid="stSidebar"] {
        background-color: #ffffff !important;
        border-right: 1px solid #e0e4e8 !important;
        min-width: 240px !important;
        max-width: 240px !important;
    }
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h1,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h2,
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3 {
        color: #4a4a4a !important;
    }
    [data-testid="stSidebar"] button[kind="secondary"],
    [data-testid="stSidebar"] button[kind="primary"] {
        background-color: transparent !important;
        border: 1px solid transparent !important;
        color: #5c6ac4 !important; /* โทนม่วง PEA */
        border-radius: 8px !important;
        padding: 0.6rem 1rem !important;
        font-weight: 500 !important;
        font-size: 0.9rem !important;
        text-align: left !important;
        justify-content: flex-start !important;
        transition: all 0.2s ease !important;
    }
    [data-testid="stSidebar"] button:hover {
        background-color: #f3f0ff !important; /* Hover สีม่วงอ่อน */
        color: #4b0082 !important;
    }
    
    /* ===== Top header banner ===== */
    .app-header {
        background: linear-gradient(135deg, #74519b 0%, #4b0082 100%); /* PEA Purple Gradient */
        color: white;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 4px 15px rgba(75, 0, 130, 0.15);
    }
    .app-header .title { font-size: 1.5rem; font-weight: 600; margin: 0; letter-spacing: 0.5px;}
    .app-header .subtitle { font-size: 0.9rem; opacity: 0.9; margin: 0; font-weight: 300; }
    
    /* ===== Section Card ===== */
    .section-card {
        background: #ffffff;
        border: 1px solid #eaedf1;
        border-radius: 10px;
        padding: 1.5rem;
        margin-bottom: 1.2rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    
    /* ===== Dashboard Metric Cards (Modern Flat) ===== */
    .metric-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .metric-card {
        flex: 1 1 140px;
        background: #ffffff;
        border-radius: 10px;
        padding: 1.2rem;
        border: 1px solid #eaedf1;
        box-shadow: 0 2px 6px rgba(0,0,0,0.03);
        transition: transform 0.2s ease;
    }
    .metric-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .metric-card .value { font-size: 2rem; font-weight: 700; margin: 0; color: #2d3748; }
    .metric-card .label { font-size: 0.85rem; font-weight: 500; margin: 0; color: #718096; margin-top: 4px;}
    
    /* Semantic Colors for Values */
    .metric-total .value { color: #4b0082; }
    .metric-done .value { color: #38a169; }
    .metric-pending .value { color: #dd6b20; }
    
    /* ===== Primary button override ===== */
    button[kind="primary"] {
        background-color: #74519b !important; /* PEA Purple */
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        font-weight: 500 !important;
        padding: 0.5rem 1.2rem !important;
        transition: all 0.2s ease !important;
    }
    button[kind="primary"]:hover {
        background-color: #5c3f82 !important;
        box-shadow: 0 4px 12px rgba(116, 81, 155, 0.3) !important;
    }
    
    /* ===== Tabs styling ===== */
    .stTabs [data-baseweb="tab-list"] {
        gap: 12px;
        border-bottom: 1px solid #e2e8f0;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 10px 20px !important;
        font-weight: 500 !important;
        color: #64748b !important;
        background-color: transparent !important;
        border: none !important;
    }
    .stTabs [aria-selected="true"] {
        color: #74519b !important;
        border-bottom: 3px solid #74519b !important;
        background-color: transparent !important;
    }
    .stTabs [data-baseweb="tab-highlight"] { display: none !important; }
    
    /* ===== Table header (Cleaner Look) ===== */
    .table-header {
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        border-bottom: 2px solid #cbd5e1;
        padding: 12px 14px;
        color: #334155;
        display: flex;
        font-weight: 600;
        font-size: 0.85rem;
        margin-bottom: 8px;
    }
    
    /* ===== Info banner (Transformer info) ===== */
    .tr-info-banner {
        background: #fdfcff;
        border-left: 4px solid #74519b;
        padding: 1rem 1.2rem;
        border-radius: 0 8px 8px 0;
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .tr-info-item .lbl { color: #64748b; font-size: 0.8rem; font-weight: 500;}
    .tr-info-item .val { color: #1e293b; font-weight: 600; font-size: 1rem; }
    
    /* ===== Mobile Responsive tweaks ===== */
    @media (max-width: 768px) {
        .block-container { padding-top: 2rem !important; }
        .app-header { flex-direction: column; text-align: center; }
        .metric-card { flex: 1 1 100%; text-align: center;} /* Stack cards on mobile */
    }
    </style>
    """, unsafe_allow_html=True)
