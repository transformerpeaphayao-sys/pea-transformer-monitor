import streamlit as st
import streamlit.components.v1 as components
from core import *
import os
import uuid
import pytz
import requests
import base64

def fetch_google_drive_image_base64(file_id):
    try:
        url = f"https://drive.google.com/uc?id={file_id}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            encoded_image = base64.b64encode(response.content).decode('utf-8')
            return f"data:image/jpeg;base64,{encoded_image}"
    except Exception as e:
        return None
    return None

st.set_page_config(page_title='ระบบบันทึกและตรวจสอบโหลดหม้อแปลง PEA (Back Office)', page_icon='💻', layout='wide', initial_sidebar_state='expanded')
load_custom_css()

def render_metric_card(label, value, color_class, icon=""):
    """Helper function สำหรับสร้างกล่อง Metric แบบ Human-readable"""
    return f'<div class="metric-card {color_class}"><div style="display: flex; justify-content: space-between; align-items: flex-start;"><p class="value">{value}</p><div class="metric-icon">{icon}</div></div><p class="label">{label}</p></div>'

@st.cache_resource
def get_active_sessions():
    return {}


if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'page' not in st.session_state:
    st.session_state.page = 'Login'

# Handle URL query params for deep linking (e.g., from HTML tables)
# 1. อ่านค่า Parameter ทั้งหมดมาก่อน
query_token = st.query_params.get("token")
query_profile = st.query_params.get("profile_pea")
query_page = st.query_params.get("page")

# 2. ตรวจสอบสิทธิ์ด้วย Token (ปลอดภัยกว่า)
if query_token and query_token in get_active_sessions():
    st.session_state.logged_in = True
    st.session_state.user_name = get_active_sessions()[query_token]["name"]
    st.session_state.emp_id = get_active_sessions()[query_token]["emp_id"]

# 3. นำทางไปยังหน้าที่ต้องการ
if st.session_state.get("logged_in", False):
    if query_profile:
        st.session_state.page = "Profile"
        st.session_state.selected_pea_for_profile = query_profile
    elif query_page:
        st.session_state.page = query_page

# 4. ล้าง Query Params รวดเดียวเพื่อป้องกันหน้าจอโหลดซ้ำซ้อน (Streamlit Rerun Loop)
st.query_params.clear()


# --- Scroll to top on page change ---
if "last_page" not in st.session_state:
    st.session_state.last_page = st.session_state.page

if st.session_state.last_page != st.session_state.page:
    st.session_state.last_page = st.session_state.page
    components.html("""
        <script>
            function scrollToTop() {
                // Scroll main content area
                window.parent.scrollTo(0, 0);
                window.parent.document.documentElement.scrollTop = 0;
                window.parent.document.body.scrollTop = 0;
                
                const main = window.parent.document.querySelector('.main');
                if (main) { main.scrollTop = 0; main.scrollTo(0, 0); }
                
                const block = window.parent.document.querySelector('.block-container');
                if (block) { block.scrollIntoView({behavior: 'instant'}); }
                
                // Target Streamlit's internal scroll container
                const appView = window.parent.document.querySelector('[data-testid="stAppViewContainer"]');
                if (appView) { appView.scrollTop = 0; }
                
                const mainBlock = window.parent.document.querySelector('[data-testid="stMain"]');
                if (mainBlock) { mainBlock.scrollTop = 0; }
            }
            // Execute immediately and again after short delays to catch late renders
            scrollToTop();
            setTimeout(scrollToTop, 100);
            setTimeout(scrollToTop, 300);
        </script>
    """, height=0)

with st.sidebar:
    import os
    if os.path.exists("pea-logo.png"):
        import base64 as b64_logo
        with open("pea-logo.png", "rb") as f_logo:
            logo_sidebar_b64 = b64_logo.b64encode(f_logo.read()).decode()
        st.markdown(f'''
        <div style="text-align:center; padding: 0.5rem 0 0.2rem 0;">
            <img src="data:image/png;base64,{logo_sidebar_b64}" style="width:70px; height:70px; object-fit:contain; margin-bottom:5px;">
            <div style="font-size:1rem; font-weight:700; color:#e94560; letter-spacing:1px;">PEA LOAD</div>
            <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); margin-top:1px;">Back Office</div>
        </div>
        ''', unsafe_allow_html=True)
    else:
        st.markdown('''
        <div style="text-align:center; padding: 0.5rem 0 0.2rem 0;">
            <div style="font-size:1rem; font-weight:700; color:#e94560; letter-spacing:1px;">PEA LOAD</div>
            <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); margin-top:1px;">Back Office</div>
        </div>
        ''', unsafe_allow_html=True)
    st.markdown("---")
    
    if st.session_state.logged_in:
        st.markdown(f"<div style='text-align:center; font-weight:600; padding: 0.3rem 0; color: white;'>ผู้ใช้งาน:<br>{st.session_state.user_name}</div>", unsafe_allow_html=True)
        st.markdown("---")
        if st.button("สรุปผลงาน", use_container_width=True):
            st.session_state.page = "Summary"
            st.rerun()
            
        if st.button("กรองข้อมูล (Filter)", use_container_width=True):
            st.session_state.page = "Filter"
            st.rerun()
            
        if st.button("ประวัติหม้อแปลง", use_container_width=True):
            st.session_state.page = "Profile"
            st.session_state.selected_pea_for_profile = None 
            st.rerun()
            
        if st.button("ลงทะเบียนหม้อแปลง", use_container_width=True):
            st.session_state.page = "Register"
            st.rerun()
            
        st.markdown("<div style='margin-top:10px;'></div>", unsafe_allow_html=True)
        if st.button("ออกจากระบบ (Logout)", use_container_width=True, type="primary"):
            st.session_state.logged_in = False
            st.session_state.page = "Login"
            st.rerun()
    else:
        if st.button("เข้าสู่ระบบ", use_container_width=True):
            st.session_state.page = "Login"
            st.rerun()
            
    st.markdown("---")
    if st.session_state.get('logged_in', False):
        if st.button("ดึงข้อมูลล่าสุด", use_container_width=True, type="secondary"):
            load_master_data.clear()
            load_completed_data.clear()
            load_task_data.clear()
            st.rerun()

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
            col_pea_record = "PEA NO" # กำหนดค่าเริ่มต้นไว้ด้านนอก
            if not df_record.empty:
                col_pea_record = "PEA NO" if "PEA NO" in df_record.columns else df_record.columns[2] if len(df_record.columns) > 2 else "PEA NO"
                for _, row in df_record.iterrows():
                    pea = str(row.get(col_pea_record, '')).strip()
                    if pea:
                        record_latest[pea] = True
            
            completed_peas = list(record_latest.keys())
            
            with open("st_debug2.txt", "w", encoding="utf-8") as f:
                f.write(f"df_record.empty: {df_record.empty}\n")
                f.write(f"df_record.columns: {list(df_record.columns) if not df_record.empty else []}\n")
                f.write(f"completed_peas: {completed_peas[:5]}\n")
            
            # 2. หารายการล่าสุดที่ถูกสั่งงาน (Task Data)
            task_pending = {}
            if not df_task.empty and 'PEA NO' in df_task.columns:
                for _, row in df_task.iterrows():
                    pea = str(row.get(col_pea_record, '')).strip()
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
            # หน้าที่ 1: LOGIN & REGISTER PAGES
            # ==============================

            if st.session_state.page == "Login":
                st.markdown("#### เข้าสู่ระบบ (Back Office)")
                with st.form("login_form", border=True):
                    username = st.text_input("ชื่อผู้ใช้งาน (Username)")
                    password = st.text_input("รหัสผ่าน (Password)", type="password")
                    submitted = st.form_submit_button("เข้าสู่ระบบ", type="primary", use_container_width=True)
                    
                    if submitted:
                        if username and password:
                            success, name, emp_id = authenticate_user(client, SHEET_NAME, username, password)
                            if success:
                                st.session_state.logged_in = True
                                st.session_state.user_name = name
                                st.session_state.emp_id = emp_id
                                st.session_state.page = "Summary"
                                
                                # Generate token for session persistence
                                token = str(uuid.uuid4())
                                get_active_sessions()[token] = {"name": name, "emp_id": emp_id}
                                st.query_params["token"] = token
                                
                                st.success("เข้าสู่ระบบสำเร็จ!")
                                st.rerun()
                            else:
                                st.error("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง")
                        else:
                            st.warning("กรุณากรอกข้อมูลให้ครบถ้วน")
                
                st.markdown("---")
                if st.button("ลงทะเบียนผู้ใช้งานใหม่"):
                    st.session_state.page = "RegisterUser"
                    st.rerun()
                    
            elif st.session_state.page == "RegisterUser":
                st.markdown("#### ลงทะเบียนผู้ใช้งานใหม่")
                with st.form("register_user_form", border=True):
                    new_user = st.text_input("ชื่อผู้ใช้งาน (Username)*")
                    new_pass = st.text_input("รหัสผ่าน (Password)*", type="password")
                    confirm_pass = st.text_input("ยืนยันรหัสผ่าน*", type="password")
                    name = st.text_input("ชื่อ-นามสกุล*")
                    emp_id = st.text_input("รหัสพนักงาน")
                    
                    submitted = st.form_submit_button("ลงทะเบียน", type="primary", use_container_width=True)
                    
                    if submitted:
                        if not all([new_user, new_pass, confirm_pass, name]):
                            st.warning("กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน")
                        elif new_pass != confirm_pass:
                            st.error("❌ รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน")
                        else:
                            success, msg = register_user(client, SHEET_NAME, new_user, new_pass, name, emp_id)
                            if success:
                                st.success("✅ ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ")
                                time.sleep(2)
                                st.session_state.page = "Login"
                                st.rerun()
                            else:
                                st.error(msg)
                
                if st.button("🔙 กลับไปหน้าเข้าสู่ระบบ"):
                    st.session_state.page = "Login"
                    st.rerun()
                    
            elif st.session_state.page == "Summary":
                st.markdown("#### สรุปผลการดำเนินงาน")
                
                with open("st_debug.txt", "w", encoding="utf-8") as f:
                    f.write(f"df_record.empty: {df_record.empty}\n")
                    f.write(f"df_record.columns: {list(df_record.columns) if not df_record.empty else []}\n")
                    f.write(f"completed_peas: {completed_peas[:5]}\n")

                total_transformers = len(df_master)
                total_completed = len(completed_peas)
                total_pending = total_transformers - total_completed
                pct = (total_completed / total_transformers * 100) if total_transformers > 0 else 0
                
                # --- [เพิ่มใหม่] นับจำนวนที่ทำวันนี้ ---
                count_today = 0
                if not df_record.empty:
                    today_str = datetime.datetime.now(pytz.timezone('Asia/Bangkok')).strftime("%d/%m/%Y")
                    col_date = "วันที่" if "วันที่" in df_record.columns else df_record.columns[0]
                    df_today = df_record[df_record[col_date].astype(str).str.strip() == today_str]
                    if col_pea_record in df_today.columns:
                        count_today = df_today[col_pea_record].nunique()
                # ------------------------------------
                
                count_normal = 0
                count_unbalance = 0
                count_overload = 0
                
                # --- สร้าง Cache เก็บสถานะและป้ายแจ้งเตือน (รับประกันยอดตรงกับตาราง 100%) ---
                pea_alert_cache = {}
                pea_category_cache = {} # เพิ่ม Cache สำหรับกรองข้อมูล
                
                if not df_record.empty and total_completed > 0:
                    for pea in completed_peas:
                        pct_load, pct_unb = calculate_transformer_status(df_master, df_record, pea)
                        
                        status_html = '<span style="color: gray;">-</span>'
                        cat = "normal"
                        
                        if pct_load is not None and pct_unb is not None:
                            alerts = []
                            # 1. เช็ค Overload (>80%) - ให้ความสำคัญสูงสุด (Worst-case)
                            if pct_load >= 100:
                                alerts.append(f'<span style="background: var(--danger-bg); color: var(--danger-text); border: 1px solid var(--danger-border); padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; margin-bottom:4px; display:inline-block; font-weight:600;">Overload {pct_load:.0f}%</span>')
                                cat = "overload"
                            elif pct_load >= 80:
                                alerts.append(f'<span style="background: var(--danger-bg); color: var(--danger-text); border: 1px solid var(--danger-border); padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; margin-bottom:4px; display:inline-block; font-weight:600;">Load {pct_load:.0f}%</span>')
                                cat = "overload"
                                
                            # 2. เช็ค Unbalance (>20%) - เปลี่ยนสีเป็นส้ม/เหลือง เพื่อไม่ให้สับสนกับ Overload
                            if pct_unb >= 30:
                                alerts.append(f'<span style="background: var(--warning-bg); color: var(--warning-text); border: 1px solid var(--warning-border); padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; display:inline-block; font-weight:600;">Unbalance {pct_unb:.0f}%</span>')
                                if cat != "overload": cat = "unbalance"
                            elif pct_unb >= 20:
                                alerts.append(f'<span style="background: var(--warning-bg); color: var(--warning-text); border: 1px solid var(--warning-border); padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; display:inline-block; font-weight:600;">Unbalance {pct_unb:.0f}%</span>')
                                if cat != "overload": cat = "unbalance"
                                
                            if alerts:
                                status_html = "<div style='display:flex; flex-direction:column; gap:4px; align-items:flex-start;'>" + "".join(alerts) + "</div>"
                            else:
                                status_html = '<span style="background: var(--success-bg); color: var(--success-text); border: 1px solid var(--success-border); padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight:600;">ปกติ</span>'
                        else:
                            status_html = '<span style="color: gray; font-size: 0.8rem;">ไม่สามารถคำนวณได้</span>'
                            cat = "error"
                            
                        # เก็บลง Cache
                        pea_alert_cache[pea] = status_html
                        pea_category_cache[pea] = cat
                        
                        # นับยอดแบบ Mutually Exclusive (ไม่นับซ้ำซ้อน)
                        if cat == "overload": count_overload += 1
                        elif cat == "unbalance": count_unbalance += 1
                        elif cat == "normal": count_normal += 1
                # ------------------------------------------------

                # --- Dashboard Metric Cards (ดึง CSS จาก core.py) ---
                # --- Dashboard Metric Cards (Human-coded approach) ---
                cards_html = (
                    f'<div class="metric-row">'
                    f'{render_metric_card("หม้อแปลงทั้งหมด", total_transformers, "metric-total", "🏢")}'
                    f'{render_metric_card("ทำเสร็จแล้ว", total_completed, "metric-done", "✅")}'
                    f'{render_metric_card("ทำวันนี้", count_today, "metric-today", "🔥")}'
                    f'{render_metric_card("ยังไม่ได้ทำ", total_pending, "metric-pending", "⏳")}'
                    f'</div><div class="metric-row" style="margin-top: 1rem;">'
                    f'{render_metric_card("โหลดปกติ / สมดุล", count_normal, "bg-normal", "⚡")}'
                    f'{render_metric_card("Unbalance (>20%)", count_unbalance, "bg-unb", "⚠️")}'
                    f'{render_metric_card("Overload (>80%)", count_overload, "bg-ovl", "🚨")}'
                    f'</div>'
                )
                st.markdown(cards_html, unsafe_allow_html=True)
                
                # Progress bar color dynamic logic
                if pct < 30:
                    bar_color = "linear-gradient(90deg, #fc8181 0%, #e53e3e 100%)" # Red
                elif pct < 70:
                    bar_color = "linear-gradient(90deg, #fbd38d 0%, #ed8936 100%)" # Orange
                elif pct < 100:
                    bar_color = "linear-gradient(90deg, #63b3ed 0%, #3182ce 100%)" # Blue
                else:
                    bar_color = "linear-gradient(90deg, #68d391 0%, #38a169 100%)" # Green
                
                # Progress bar
                st.markdown(f"""
                <div class="progress-wrapper" style="margin-bottom: 2rem; padding: 1rem; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
                    <div style="display:flex; justify-content:space-between; font-size:0.9rem; font-weight:600; margin-bottom:10px; color:var(--text-dark);">
                        <span>ความคืบหน้าภาพรวม (Overall Progress)</span>
                        <span style="color:var(--primary-pea);">{pct:.1f}%</span>
                    </div>
                    <div class="progress-bar-bg" style="border-radius: 999px; overflow: hidden; background-color: #e2e8f0; height: 14px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                        <div class="progress-bar-fill" style="width:{pct}%; height: 100%; background: {bar_color}; border-radius: 999px; text-align: center; color: white; font-size: 0.75rem; font-weight: bold; line-height: 14px;">
                            {f"{pct:.0f}%" if pct > 5 else ""}
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 1.5rem;"></div>
                """, unsafe_allow_html=True)
                
                tab1, tab2, tab3 = st.tabs(["ทำเสร็จแล้ว", "ยังไม่เสร็จ", "หม้อแปลงวิกฤต (Critical)"])
                
                with tab1:
                    # --- [Control Panel: Search & Filter] ---
                    st.markdown("""
                        <div style='background-color:#ffffff; padding:1.25rem 1.5rem; border-radius:8px; border:1px solid var(--border-color); margin-bottom:1.5rem; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; gap:0.5rem;'>
                    """, unsafe_allow_html=True)
                    
                    col_f1, col_f2 = st.columns([1, 1])
                    with col_f1:
                        search_completed = st.text_input("ค้นหาด้วย รหัส PEA หรือ สถานที่", key="search_comp", placeholder="พิมพ์ค้นหา...")
                    with col_f2:
                        st.markdown("<div style='font-size:0.85rem; font-weight:500; color:var(--text-muted); margin-bottom:4px;'>กรองดูเฉพาะสถานะ:</div>", unsafe_allow_html=True)
                        summary_filter = st.segmented_control(
                            "กรองสถานะ",
                            options=["ทั้งหมด", "Overload", "Unbalance", "ปกติ"],
                            default="ทั้งหมด",
                            label_visibility="collapsed"
                        )
                        if summary_filter is None:
                            summary_filter = "ทั้งหมด"
                    st.markdown("</div>", unsafe_allow_html=True)
                    # ----------------------------------------
                    
                    if completed_peas:
                        df_completed_master = df_master[df_master['PEANO หม้อแปลง'].astype(str).isin(completed_peas)]
                        
                        # 1. กรองด้วยข้อความ Search
                        mask = df_completed_master['PEANO หม้อแปลง'].astype(str).str.contains(search_completed, case=False, na=False) | \
                               df_completed_master['สถานที่'].astype(str).str.contains(search_completed, case=False, na=False)
                        filtered_df = df_completed_master[mask].copy()
                        
                        # 2. กรองด้วยปุ่มสถานะที่กดเลือก
                        if summary_filter == "Overload":
                            filtered_df = filtered_df[filtered_df['PEANO หม้อแปลง'].astype(str).map(pea_category_cache) == "overload"]
                        elif summary_filter == "Unbalance":
                            filtered_df = filtered_df[filtered_df['PEANO หม้อแปลง'].astype(str).map(pea_category_cache) == "unbalance"]
                        elif summary_filter == "ปกติ":
                            filtered_df = filtered_df[filtered_df['PEANO หม้อแปลง'].astype(str).map(pea_category_cache) == "normal"]
                            
                        # --- เรียงลำดับจากล่าสุดที่ตรวจ ขึ้นก่อนเสมอ ---
                        if not df_record.empty and not filtered_df.empty:
                            temp_rec = df_record.copy()
                            col_date_r = "วันที่" if "วันที่" in temp_rec.columns else temp_rec.columns[0]
                            col_time_r = "เวลา" if "เวลา" in temp_rec.columns else temp_rec.columns[1]
                            temp_rec['DT'] = pd.to_datetime(
                                temp_rec[col_date_r].astype(str) + ' ' + temp_rec[col_time_r].astype(str),
                                format='%d/%m/%Y %H:%M:%S',
                                errors='coerce'
                            )
                            # หาเวลาล่าสุดของแต่ละ PEA NO
                            latest_dt_map = temp_rec.groupby(temp_rec[col_pea_record].astype(str))['DT'].max().to_dict()
                            
                            # นำเวลาล่าสุดมาแปะในตารางสรุป แล้วสั่งเรียงจากมากไปน้อย (ล่าสุดขึ้นบน)
                            filtered_df['Latest_DT'] = filtered_df['PEANO หม้อแปลง'].astype(str).map(latest_dt_map)
                            filtered_df = filtered_df.sort_values(by='Latest_DT', ascending=False)
                        # ----------------------------------------------------
                        
                        if filtered_df.empty:
                            st.markdown("""
                            <div style="text-align: center; padding: 3rem 2rem; background: #ffffff; border-radius: 8px; border: 2px dashed var(--border-color); margin-top: 1rem;">
                                <h4 style="color: var(--text-main); font-weight: 600; margin-bottom: 0.5rem;">ไม่พบข้อมูลที่ค้นหา</h4>
                                <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0;">ลองเปลี่ยนคำค้นหา หรือเปลี่ยนเงื่อนไขการกรองสถานะด้านบน</p>
                            </div>
                            """, unsafe_allow_html=True)
                        else:
                            st.markdown(f"<div style='font-size:0.9rem; font-weight:600; color:var(--text-muted); margin-bottom:12px;'>ผลลัพธ์: <span style='color:var(--pea-primary-dark);'>{len(filtered_df)}</span> รายการ</div>", unsafe_allow_html=True)
                        
                        table_html = "<div class='pea-table-wrapper'><table class='pea-table'><thead><tr><th>PEA No.</th><th>สถานที่ติดตั้ง</th><th>ขนาด (kVA)</th><th>ระบบเฟส</th><th>การแจ้งเตือน</th></tr></thead><tbody>"
                        
                        for i, (_, row) in enumerate(filtered_df.head(50).iterrows()):
                            pea = str(row['PEANO หม้อแปลง'])
                            loc = row.get('สถานที่', '-')
                            kva_val = row.get('ค่าพิกัด kVA หม้อแปลง', '-')
                            phase = row.get('ระบบเฟส', '-')
                            status_html = pea_alert_cache.get(pea, '<span style="color: gray; font-size: 0.8rem;">ไม่สามารถคำนวณได้</span>')
                            
                            row_class = "group-odd" if i % 2 == 1 else "group-even"
                            
                            current_token = st.query_params.get("token", "")
                            token_param = f"&token={current_token}" if current_token else ""
                            auth_param = f"&auth_user={st.session_state.get('user_name', 'Admin')}"
                            pea_link = f"<a href='?profile_pea={pea}&page=Profile{token_param}{auth_param}' target='_self' style='color:var(--text-dark);font-weight:600;text-decoration:none;'>🔗 {pea}</a>"
                            
                            table_html += f"<tr class='{row_class}'>"
                            table_html += f"<td class='grouped-cell' style='width:150px;'>{pea_link}</td>"
                            table_html += f"<td>{loc}</td>"
                            table_html += f"<td class='num-cell' style='width:100px;'>{kva_val}</td>"
                            table_html += f"<td style='width:120px;'>{phase}</td>"
                            table_html += f"<td>{status_html}</td>"
                            table_html += "</tr>"
                            
                        table_html += "</tbody></table></div>"
                        st.markdown(table_html, unsafe_allow_html=True)
                        
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
                        
                        table_html = "<div class='pea-table-wrapper'><table class='pea-table'><thead><tr><th>PEA No.</th><th>สถานที่ติดตั้ง</th><th>ขนาด (kVA)</th><th>ระบบเฟส</th></tr></thead><tbody>"
                        
                        for i, (_, row) in enumerate(filtered_df_p.head(50).iterrows()):
                            pea = str(row['PEANO หม้อแปลง'])
                            loc = row.get('สถานที่', '-')
                            kva_val = row.get('ค่าพิกัด kVA หม้อแปลง', '-')
                            phase = row.get('ระบบเฟส', '-')
                            
                            row_class = "group-odd" if i % 2 == 1 else "group-even"
                            
                            current_token = st.query_params.get("token", "")
                            token_param = f"&token={current_token}" if current_token else ""
                            auth_param = f"&auth_user={st.session_state.get('user_name', 'Admin')}"
                            pea_link = f"<a href='?profile_pea={pea}&page=Profile{token_param}{auth_param}' target='_self' style='color:var(--text-dark);font-weight:600;text-decoration:none;'>🔗 {pea}</a>"
                            
                            table_html += f"<tr class='{row_class}'>"
                            table_html += f"<td class='grouped-cell' style='width:150px;'>{pea_link}</td>"
                            table_html += f"<td>{loc}</td>"
                            table_html += f"<td class='num-cell' style='width:100px;'>{kva_val}</td>"
                            table_html += f"<td style='width:120px;'>{phase}</td>"
                            table_html += "</tr>"
                            
                        table_html += "</tbody></table></div>"
                        st.markdown(table_html, unsafe_allow_html=True)
                        
                        if len(filtered_df_p) > 50:
                            st.info(f"แสดงผล 50 จาก {len(filtered_df_p)} รายการ")
                    else:
                        st.success("🎉 ทำเสร็จครบทุกจุดแล้วครับ!")
                        
                with tab3:
                    st.markdown("##### 🚨 รายงานจัดอันดับหม้อแปลงวิกฤต (Top Critical Transformers)")
                    st.caption("จัดเรียงลำดับความสำคัญจาก %Load สูงสุด (เสี่ยงหม้อแปลงชำรุด) ตามด้วย %Unbalance สูงสุด เพื่อให้ทีมบำรุงรักษาวางแผนเข้าแก้ไขได้ทันท่วงที")
                    
                    critical_data = []
                    
                    if not df_record.empty and len(completed_peas) > 0:
                        for pea in completed_peas:
                            # ดึงข้อมูลจาก Cache ที่ประมวลผลไว้แล้วด้านบนสุดของหน้า Summary
                            status_html = pea_alert_cache.get(pea, '')
                            cat = pea_category_cache.get(pea, 'normal')
                            
                            # กรองเฉพาะเคสที่มีปัญหา Overload หรือ Unbalance สูง
                            if cat in ["overload", "unbalance"]:
                                # คำนวณค่าเพื่อเอามาใส่ตาราง (หรือดึงจากที่เคยคำนวณ)
                                pct_load, pct_unb = calculate_transformer_status(df_master, df_record, pea)
                                
                                if pct_load is not None and pct_unb is not None:
                                    # หาข้อมูลสถานที่ และพิกัด kVA จาก Master Data
                                    master_row = df_master[df_master['PEANO หม้อแปลง'].astype(str) == pea]
                                    loc = master_row.iloc[0].get('สถานที่', '-') if not master_row.empty else '-'
                                    kva = master_row.iloc[0].get('ค่าพิกัด kVA หม้อแปลง', '-') if not master_row.empty else '-'
                                    
                                    issues = []
                                    if pct_load >= 100: issues.append("🔴 Overload")
                                    elif pct_load >= 80: issues.append("🟡 High Load")
                                    
                                    if pct_unb >= 30: issues.append("🔴 Severe Unbalance")
                                    elif pct_unb >= 20: issues.append("🟠 Unbalance")
                                    
                                    critical_data.append({
                                        "PEA NO": pea,
                                        "สถานที่": loc,
                                        "พิกัด (kVA)": str(kva),
                                        "%Load": float(pct_load),
                                        "%Unbalance": float(pct_unb),
                                        "ปัญหาที่พบ": " + ".join(issues)
                                    })
                    
                    if critical_data:
                        # สร้าง DataFrame และจัดเรียงข้อมูล
                        df_critical = pd.DataFrame(critical_data)
                        df_critical = df_critical.sort_values(
                            by=["%Load", "%Unbalance"], 
                            ascending=[False, False]
                        ).reset_index(drop=True)
                        
                        # สร้างตารางแสดงผลแบบกราฟิกสวยงามด้วย st.column_config
                        st.dataframe(
                            df_critical,
                            column_config={
                                "PEA NO": st.column_config.TextColumn("รหัสหม้อแปลง", width="medium"),
                                "สถานที่": st.column_config.TextColumn("สถานที่ติดตั้ง", width="large"),
                                "%Load": st.column_config.ProgressColumn(
                                    "โหลดใช้งาน (%Load)",
                                    help="เปอร์เซ็นต์โหลดเทียบกับพิกัดสูงสุดของหม้อแปลง",
                                    format="%.2f%%",
                                    min_value=0,
                                    max_value=120, # ให้สุดสเกลที่ 120% เพื่อให้เห็นชัดว่าเกิน 100%
                                ),
                                "%Unbalance": st.column_config.ProgressColumn(
                                    "ความไม่สมดุล (%Unb)",
                                    help="เปอร์เซ็นต์กระแสไม่สมดุล",
                                    format="%.2f%%",
                                    min_value=0,
                                    max_value=100,
                                ),
                                "ปัญหาที่พบ": st.column_config.TextColumn("สถานะแจ้งเตือน")
                            },
                            use_container_width=True,
                            hide_index=True
                        )
                        
                        # ปุ่มสำหรับดาวน์โหลด Report ไปจัดแผนงาน
                        st.markdown("<br>", unsafe_allow_html=True)
                        csv_critical = df_critical.to_csv(index=False).encode('utf-8-sig')
                        st.download_button(
                            label="📥 ดาวน์โหลดรายการหม้อแปลงวิกฤต (CSV)",
                            data=csv_critical,
                            file_name=f"critical_transformers_report.csv",
                            mime="text/csv",
                            type="secondary",
                            use_container_width=True
                        )
                    else:
                        st.markdown("""
                        <div style="text-align: center; padding: 3rem; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
                            <h4 style="color: #166534; margin-bottom: 0;">เยี่ยมมาก!</h4>
                            <p style="color: #15803d; margin-top: 0.5rem;">จากการตรวจสอบข้อมูลล่าสุด ยังไม่พบหม้อแปลงที่อยู่ในเกณฑ์วิกฤต (Overload หรือ Unbalance สูง)</p>
                        </div>
                        """, unsafe_allow_html=True)

            # ==============================
            # หน้าที่ 4: FILTER PAGE
            # ==============================
            elif st.session_state.page == "Filter":
                if df_record.empty:
                    st.markdown("#### 🔍 กรองข้อมูลประวัติการวัดกระแส")
                    # ใช้ HTML วาด Empty State สวยๆ
                    st.markdown("""
                    <div style="text-align: center; padding: 4rem 2rem; background: #ffffff; border-radius: 12px; border: 2px dashed #e2e8f0; margin-top: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.8;">📭</div>
                        <h4 style="color: #475569; font-weight: 600; margin-bottom: 0.5rem;">ยังไม่มีประวัติการวัดกระแสในระบบ</h4>
                        <p style="color: #94a3b8; font-size: 0.95rem; margin-top: 0;">ข้อมูลการวัดโหลดจากหน้างานจะมาปรากฏที่นี่<br>คุณสามารถกลับมาตรวจสอบได้ในภายหลัง</p>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown('''
                    <div class="section-card" style="margin-top: 1rem;">
                        <div class="pea-card-header" style="padding: 16px 20px;">
                            <div style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">🔍 กรองข้อมูลประวัติการวัดกระแส</div>
                            <div style="font-size: 0.9rem; font-weight: 400; opacity: 0.9;">ป้อนรายละเอียดเงื่อนไขที่ต้องการค้นหาประวัติการวัดกระแส</div>
                        </div>
                    ''', unsafe_allow_html=True)
                    
                    col_f1, col_f2, col_f3 = st.columns(3)
                    
                    with col_f1:
                        pea_list = ["ทั้งหมด"] + sorted(df_record[col_pea_record].astype(str).unique().tolist())
                        selected_pea = st.selectbox("PEA NO หม้อแปลง", options=pea_list)
                    
                    with col_f2:
                        col_date = "วันที่" if "วันที่" in df_record.columns else df_record.columns[0]
                        date_list = ["ทั้งหมด"] + sorted(df_record[col_date].astype(str).unique().tolist(), reverse=True)
                        selected_date = st.selectbox("วันที่บันทึก", options=date_list)
                    
                    with col_f3:
                        status_filter = st.selectbox("สถานะการแจ้งเตือน", options=["ทั้งหมด", "Overload", "ใกล้เกินพิกัด", "Unbalance (วิกฤต)", "Unbalance", "ปกติ"])
                        
                    st.markdown("**2. กรองตามกระแสของฟีดเดอร์**")
                    col_f4, col_f5 = st.columns([1, 2])
                    with col_f4:
                        exclude_total = st.checkbox("ไม่รวมแถวที่เป็นผล 'รวม'", value=True, help="แสดงเฉพาะข้อมูลของแต่ละฟีดเดอร์ (F1, F2,...)")
                    with col_f5:
                        min_amp, max_amp = st.slider("ช่วงกระแสที่ต้องการค้นหา (Amp)", min_value=0, max_value=250, value=(0, 250), step=5, help="ค้นหาหม้อแปลงที่มีกระแสเฟสใดเฟสหนึ่งอยู่ในช่วงนี้")
                        
                    st.markdown("**3. กรองค้นหาความผิดปกติ (Smart Grid)**")
                    col_f6, col_f7 = st.columns([1, 2])
                    with col_f6:
                        filter_bitcoin = st.checkbox("ค้นหาโหลดที่น่าสงสัย (Bitcoin / Harmonic สูง)", value=False, help="แสดงเฉพาะรายการที่มีกระแสในสายนิวทรอลสูงผิดปกติจนน่าสงสัยว่าจะเป็นเครื่องขุด Bitcoin หรือโหลด Non-linear ขนาดใหญ่")
                    with col_f7:
                        min_harm, max_harm = st.slider("ช่วงกระแส Harmonic แฝงที่ต้องการค้นหา (Amp)", min_value=0, max_value=250, value=(0, 250), step=5, help="ค้นหาหม้อแปลงที่มีกระแส Harmonic แฝงอยู่ในช่วงนี้")
                        
                    st.markdown('</div>', unsafe_allow_html=True)
                    
                    # --- JS: เปลี่ยนสี Slider Harmonic เป็นสีเขียว (ใช้ iframe srcdoc ซึ่งเป็น same-origin) ---
                    # --- JS: เปลี่ยนสี Slider Harmonic เป็นสีเขียว (ใช้ iframe srcdoc ซึ่งเป็น same-origin) ---
                    st.markdown('''
                    <iframe srcdoc='<html><body><script>
                    var p=window.parent.document;
                    var n=0;
                    var t=setInterval(function(){
                    n++;if(n>100){clearInterval(t);return;}
                    var l=p.querySelectorAll("label");
                    for(var i=0;i<l.length;i++){
                    if(l[i].textContent.indexOf("Harmonic")>-1){
                    var s=l[i].closest("[data-testid=stSlider]");
                    if(!s)continue;
                    var thumbs=s.querySelectorAll("[role=slider]");
                    if(thumbs.length===0)continue;
                    var originalColor=getComputedStyle(thumbs[0]).backgroundColor;
                    thumbs.forEach(function(e){
                    e.style.setProperty("background-color","#198754","important");
                    e.style.setProperty("border-color","#198754","important");
                    });
                    s.querySelectorAll("div").forEach(function(e){
                    if(getComputedStyle(e).backgroundColor===originalColor && e.getAttribute("role")!=="slider"){
                    e.style.setProperty("background-color","#198754","important");
                    }
                    });
                    s.querySelectorAll("div,span").forEach(function(e){
                    var c=getComputedStyle(e).color;
                    if(c===originalColor || c==="rgb(255, 75, 75)" || c==="rgb(233, 69, 96)"){
                    e.style.setProperty("color","#198754","important");
                    }
                    });
                    clearInterval(t);return;
                    }}
                    },300);
                    </script></body></html>' style='width:0;height:0;border:none;position:absolute;'></iframe>
                    ''', unsafe_allow_html=True)
                    
                    # --- Data Processing ---
                    filtered_df = df_record.copy()
                    
                    if selected_pea != "ทั้งหมด":
                        filtered_df = filtered_df[filtered_df[col_pea_record].astype(str) == selected_pea]
                    
                    if selected_date != "ทั้งหมด":
                        filtered_df = filtered_df[filtered_df[col_date].astype(str) == selected_date]
                        
                    col_feeder = "ฟิดเดอร์" if "ฟิดเดอร์" in filtered_df.columns else "Feeder" if "Feeder" in filtered_df.columns else filtered_df.columns[3]
                    col_a = "กระแส A" if "กระแส A" in filtered_df.columns else "Ph A" if "Ph A" in filtered_df.columns else filtered_df.columns[4]
                    col_b = "กระแส B" if "กระแส B" in filtered_df.columns else "Ph B" if "Ph B" in filtered_df.columns else filtered_df.columns[5]
                    col_c = "กระแส C" if "กระแส C" in filtered_df.columns else "Ph C" if "Ph C" in filtered_df.columns else filtered_df.columns[6]
                    col_n_f = "กระแส N" if "กระแส N" in filtered_df.columns else "N" if "N" in filtered_df.columns else filtered_df.columns[7] if len(filtered_df.columns) > 7 else ""
                    
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

                    if (filter_bitcoin or min_harm > 0 or max_harm < 250) and not filtered_df.empty and col_n_f:
                        def is_smart_grid_match(r):
                            a = safe_float(r.get(col_a, 0))
                            b = safe_float(r.get(col_b, 0))
                            c = safe_float(r.get(col_c, 0))
                            n = safe_float(r.get(col_n_f, 0))
                            is_btc, harm_amp, _ = check_bitcoin_miner(a, b, c, n)
                            
                            if filter_bitcoin and not is_btc:
                                return False
                                
                            if min_harm > 0 or max_harm < 250:
                                if not (min_harm <= harm_amp <= max_harm):
                                    return False
                                    
                            return True
                        
                        filtered_df = filtered_df[filtered_df.apply(is_smart_grid_match, axis=1)]

                        
                    def compute_status(row):
                        try:
                            pea = str(row.get(col_pea_record, ''))
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
                            if pct_load > 100: alerts.append("Overload")
                            elif pct_load > 80: alerts.append("ใกล้เกินพิกัด")
                            
                            if pct_unb > 30: alerts.append("Unbalance (วิกฤต)")
                            elif pct_unb > 20: alerts.append("Unbalance")
                            
                            if alerts: return ", ".join(alerts)
                            return "ปกติ"
                        except:
                            return "คำนวณไม่ได้"

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
                            # --- ใช้ CSS Class .pea-table ที่กำหนดไว้ใน core.py แทนการใช้ Inline Style ---
                            col_date_f = "วันที่" if "วันที่" in filtered_df.columns else filtered_df.columns[0]
                            col_time_f = "เวลา" if "เวลา" in filtered_df.columns else filtered_df.columns[1]
                            
                            is_new_format = "แท็ป" in filtered_df.columns
                            if is_new_format:
                                col_tap_f = "แท็ป"
                                col_feeder_f = "ฟีดเดอร์"
                                col_a_f = "กระแส A"
                                col_b_f = "กระแส B"
                                col_c_f = "กระแส C"
                                col_n_f = "กระแส N"
                                col_note_f = "หมายเหตุ"
                            else:
                                col_tap_f = None
                                col_feeder_f = "ฟิดเดอร์" if "ฟิดเดอร์" in filtered_df.columns else "Feeder" if "Feeder" in filtered_df.columns else filtered_df.columns[3]
                                col_a_f = "กระแส A" if "กระแส A" in filtered_df.columns else "Ph A" if "Ph A" in filtered_df.columns else filtered_df.columns[4]
                                col_b_f = "กระแส B" if "กระแส B" in filtered_df.columns else "Ph B" if "Ph B" in filtered_df.columns else filtered_df.columns[5]
                                col_c_f = "กระแส C" if "กระแส C" in filtered_df.columns else "Ph C" if "Ph C" in filtered_df.columns else filtered_df.columns[6]
                                col_n_f = "กระแส N" if "กระแส N" in filtered_df.columns else "N" if "N" in filtered_df.columns else filtered_df.columns[7] if len(filtered_df.columns) > 7 else ""
                                col_note_f = "หมายเหตุ" if "หมายเหตุ" in filtered_df.columns else "Note" if "Note" in filtered_df.columns else filtered_df.columns[8] if len(filtered_df.columns) > 8 else ""
                            
                            session_counts = {}
                            for _, r in filtered_df.iterrows():
                                sess = f"{r.get(col_date_f, '')}-{r.get(col_time_f, '')}-{r.get(col_pea_record, '')}"
                                session_counts[sess] = session_counts.get(sess, 0) + 1
                            
                            prev_pea = None
                            prev_session_key = None
                            group_idx = 0
                            
                            rows_f = ""
                            for i, (_, row) in enumerate(filtered_df.iterrows()):
                                pea_val = str(row.get(col_pea_record, '-'))
                                date_val = str(row.get(col_date_f, '-'))
                                time_val = str(row.get(col_time_f, '-'))
                                current_session_key = f"{date_val}-{time_val}-{pea_val}"
                                
                                is_first_in_session = False
                                if current_session_key != prev_session_key:
                                    is_first_in_session = True
                                    prev_session_key = current_session_key
                                    group_idx += 1
                                    
                                if pea_val != prev_pea:
                                    prev_pea = pea_val
                                
                                current_token = st.query_params.get("token", "")
                                token_param = f"&token={current_token}" if current_token else ""
                                auth_param = f"&auth_user={st.session_state.get('user_name', 'Admin')}"
                                pea_link = f"<a href='?profile_pea={pea_val}&page=Profile{token_param}{auth_param}' target='_self' style='color:var(--text-dark);font-weight:600;text-decoration:none;white-space:nowrap;'>🔗 {pea_val}</a>"
                                
                                # Status badge แบบจุดสี (Dot Indicator) ตามภาพอ้างอิง
                                status_val = str(row.get('Status', '')).replace('🔴', '').replace('🟡', '').replace('🟢', '').replace('🟠', '').strip()
                                if 'Overload' in status_val:
                                    status_badge = f"<span style='color:var(--text-dark); font-weight:500;'><span style='color:#e11d48; font-size:12px; margin-right:4px;'>●</span>{status_val}</span>"
                                elif 'Unbalance' in status_val:
                                    status_badge = f"<span style='color:var(--text-dark); font-weight:500;'><span style='color:#d97706; font-size:12px; margin-right:4px;'>●</span>{status_val}</span>"
                                elif 'ปกติ' in status_val:
                                    status_badge = f"<span style='color:var(--text-dark); font-weight:500;'><span style='color:#059669; font-size:12px; margin-right:4px;'>●</span>{status_val}</span>"
                                else:
                                    status_badge = f"<span style='color:var(--text-gray); font-weight:500;'><span style='color:#a3aed1; font-size:12px; margin-right:4px;'>●</span>{status_val}</span>"
                                
                                def fmt_amp(v):
                                    try:
                                        if pd.isna(v) or str(v).strip() in ['', '-']: return '-'
                                        return f"{float(v):.2f}"
                                    except:
                                        return str(v)
                                
                                a_str = fmt_amp(row.get(col_a_f, '-'))
                                b_str = fmt_amp(row.get(col_b_f, '-'))
                                c_str = fmt_amp(row.get(col_c_f, '-'))
                                n_val = row.get(col_n_f, '-') if col_n_f else '-'
                                n_str = fmt_amp(n_val)
                                
                                a_float = safe_float(row.get(col_a_f, '-'))
                                b_float = safe_float(row.get(col_b_f, '-'))
                                c_float = safe_float(row.get(col_c_f, '-'))
                                n_float = safe_float(n_val)
                                is_btc, harm_amp, in_cal = check_bitcoin_miner(a_float, b_float, c_float, n_float)
                                
                                in_cal_str = f"{in_cal:.2f}" if (a_float or b_float or c_float) else "-"
                                harm_str = f"{harm_amp:.2f}" if (a_float or b_float or c_float) else "-"
                                
                                row_class = "group-odd" if group_idx % 2 == 1 else "group-even"
                                session_start_class = "session-start" if is_first_in_session else ""
                                
                                rows_f += f"<tr class='{row_class} {session_start_class}'>"
                                
                                if is_first_in_session:
                                    r_span = session_counts[current_session_key]
                                    border_color = "#3b82f6" if group_idx % 2 == 1 else "#ef4444"
                                    border_accent = f"border-left: 4px solid {border_color} !important;"
                                    rows_f += f"<td rowspan='{r_span}' class='grouped-cell' style='{border_accent}'>{date_val}</td>"
                                    rows_f += f"<td rowspan='{r_span}' class='grouped-cell' style='{border_accent}'>{time_val}</td>"
                                    rows_f += f"<td rowspan='{r_span}' class='grouped-cell' style='{border_accent}'>{pea_link}</td>"
                                
                                tap_td = f"<td>{row.get(col_tap_f, '-')}</td>" if col_tap_f else ""
                                
                                rows_f += f"<td><span style='color:var(--text-gray);'>{row.get(col_feeder_f, '-')}</span></td>"
                                rows_f += tap_td
                                
                                # ตัวเลขทั้งหมดจัดขวา (num-cell) ดำสนิท ไม่มีกรอบ
                                rows_f += f"<td class='num-cell'><b>{a_str}</b></td>"
                                rows_f += f"<td class='num-cell'><b>{b_str}</b></td>"
                                rows_f += f"<td class='num-cell'><b>{c_str}</b></td>"
                                rows_f += f"<td class='num-cell'>{n_str}</td>"
                                rows_f += f"<td class='num-cell' style='color:var(--text-gray);'>{in_cal_str}</td>"
                                
                                if is_btc:
                                    rows_f += f"<td class='num-cell' style='color:#e11d48;'><b>{harm_str}</b></td>"
                                else:
                                    rows_f += f"<td class='num-cell'><b>{harm_str}</b></td>"
                                
                                note_str = row.get(col_note_f, '')
                                note_display = note_str if note_str else '<span style="color:#e2e8f0;">-</span>'
                                rows_f += f"<td class='text-left-cell'>{note_display}</td>"
                                
                                rows_f += f"<td>{status_badge}</td>"
                                rows_f += "</tr>"
                            
                            tap_th = f"<th>Tap</th>" if is_new_format else ""
                            
                            # โครงสร้างตารางหลัก ถอด Emoji ออก เป็นภาษาอังกฤษ/ไทย ล้วนๆ
                            filter_table = f"""<div class="pea-table-wrapper">
<table class="pea-table">
<thead>
<tr>
<th>Date</th>
<th>Time</th>
<th>PEA NO</th>
<th>Feeder</th>
{tap_th}
<th class="num-cell">A</th>
<th class="num-cell">B</th>
<th class="num-cell">C</th>
<th class="num-cell">N (วัด)</th>
<th class="num-cell">N (คำนวณ)</th>
<th class="num-cell">Harmonic แฝง</th>
<th class="text-left-cell">หมายเหตุ</th>
<th>Status</th>
</tr>
</thead>
<tbody>{rows_f}</tbody>
</table>
</div>"""
                            
                            st.markdown(filter_table, unsafe_allow_html=True)
                        # Chart if PEA is selected
                        if selected_pea != "ทั้งหมด" and len(filtered_df) > 0:
                            st.markdown(f'<div class="section-card"><div class="pea-card-header">กราฟแนวโน้มกระแส (A, B, C) ของ PEA {selected_pea}</div>', unsafe_allow_html=True)
                            
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
                <div class="pea-card-header" style="display: flex; justify-content: space-between; align-items: center; border-left: 5px solid var(--pea-gold);">
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
                        
                        if not df_record.empty and col_pea_record in df_record.columns:
                            hist_df = df_record[df_record[col_pea_record].astype(str) == search_pea]
                        else:
                            hist_df = pd.DataFrame()
                            
                        unique_sessions = 0
                        if not hist_df.empty:
                            col_date = "วันที่" if "วันที่" in hist_df.columns else hist_df.columns[0]
                            col_time = "เวลา" if "เวลา" in hist_df.columns else hist_df.columns[1]
                            unique_sessions = len(hist_df.drop_duplicates(subset=[col_date, col_time]))
                        
                        st.markdown("""
                        <div class="pea-card-header" style="border-radius: 8px 8px 0 0; margin-bottom: 0; border-left: 5px solid var(--pea-gold);">
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
                                    <span style="color: #6c757d;">พิกัด (Lat, Lng):</span> <a href="https://www.google.com/maps?layer=c&cbll={lat},{lng}" target="_blank" style="color:#2575fc; text-decoration:none; font-weight:600; border-bottom:1px dashed #2575fc;" title="คลิกเพื่อเปิด Google Street View">🗺️ {lat}, {lng}</a>
                                </div>
                                <div>
                                    <span style="color: #6c757d;">ตรวจวัดมาแล้ว:</span> <b>{unique_sessions}</b> ครั้ง
                                </div>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        if 'master_data_edit_counter' not in st.session_state:
                            st.session_state.master_data_edit_counter = 0

                        expander_label = "📝 แก้ไขข้อมูลหม้อแปลง (Master Data)" + (" " * st.session_state.master_data_edit_counter)
                        
                        with st.expander(expander_label):
                            with st.form(key=f"edit_master_form_{search_pea}_{st.session_state.master_data_edit_counter}"):
                                st.markdown("##### อัปเดตรายละเอียดหม้อแปลง")
                                c_sys, c_kva = st.columns(2)
                                with c_sys:
                                    current_sys = str(m_data.get('ระบบ', '3')).strip()
                                    idx_sys = 0 if current_sys == "1" else 1
                                    edit_m_system = st.selectbox("ระบบ (Phase)", ["1", "3"], index=idx_sys)
                                with c_kva:
                                    edit_m_kva = st.text_input("พิกัด kVA", value=str(m_data.get('ค่าพิกัด kVA หม้อแปลง', '')))
                                
                                edit_m_brand = st.text_input("ยี่ห้อหม้อแปลง", value=str(m_data.get('ยี่ห้อของหม้อแปลง', '')))
                                edit_m_loc = st.text_input("สถานที่ติดตั้ง", value=str(m_data.get('สถานที่', '')))
                                
                                c_lat, c_lng = st.columns(2)
                                with c_lat:
                                    edit_m_lat = st.text_input("Latitude", value=str(m_data.get('LATITUDE', '')))
                                with c_lng:
                                    edit_m_lng = st.text_input("Longitude", value=str(m_data.get('LONGITUDE', '')))
                                
                                submit_edit = st.form_submit_button("💾 บันทึกการแก้ไข", type="primary", use_container_width=True)
                                if submit_edit:
                                    updated_data = {
                                        "ระบบ": edit_m_system,
                                        "ค่าพิกัด kVA หม้อแปลง": edit_m_kva,
                                        "ยี่ห้อของหม้อแปลง": edit_m_brand,
                                        "สถานที่": edit_m_loc,
                                        "LATITUDE": edit_m_lat,
                                        "LONGITUDE": edit_m_lng
                                    }
                                    with st.spinner("กำลังบันทึกข้อมูลแก้ไขลง Master Data..."):
                                        if update_master_data_in_sheet(client, SHEET_NAME, search_pea, updated_data):
                                            st.session_state.master_data_edit_counter += 1
                                            st.success("บันทึกการแก้ไขเรียบร้อยแล้ว! กำลังรีเฟรชหน้าจอ...")
                                            time.sleep(1)
                                            st.rerun()


                        if not hist_df.empty:
                            st.markdown("##### 📑 ประวัติบันทึกข้อมูลโหลด:")
                            
                            # สร้างตาราง HTML สวยงาม แบ่งสีตามรอบการวัด
                            col_date = "วันที่" if "วันที่" in hist_df.columns else hist_df.columns[0]
                            col_time = "เวลา" if "เวลา" in hist_df.columns else hist_df.columns[1]
                            
                            is_hist_new_format = "แท็ป" in hist_df.columns
                            if is_hist_new_format:
                                col_tap_h = "แท็ป"
                                col_feeder = "ฟีดเดอร์"
                                col_a_h = "กระแส A"
                                col_b_h = "กระแส B"
                                col_c_h = "กระแส C"
                                col_n_h = "กระแส N"
                                col_note_h = "หมายเหตุ"
                            else:
                                col_tap_h = None
                                col_feeder = "ฟิดเดอร์" if "ฟิดเดอร์" in hist_df.columns else "Feeder" if "Feeder" in hist_df.columns else hist_df.columns[3]
                                col_a_h = "กระแส A" if "กระแส A" in hist_df.columns else "Ph A" if "Ph A" in hist_df.columns else hist_df.columns[4]
                                col_b_h = "กระแส B" if "กระแส B" in hist_df.columns else "Ph B" if "Ph B" in hist_df.columns else hist_df.columns[5]
                                col_c_h = "กระแส C" if "กระแส C" in hist_df.columns else "Ph C" if "Ph C" in hist_df.columns else hist_df.columns[6]
                                col_n_h = "กระแส N" if "กระแส N" in hist_df.columns else "N" if "N" in hist_df.columns else hist_df.columns[7] if len(hist_df.columns) > 7 else ""
                                col_note_h = "หมายเหตุ" if "หมายเหตุ" in hist_df.columns else "Note" if "Note" in hist_df.columns else hist_df.columns[8] if len(hist_df.columns) > 8 else ""
                            
                            session_counts = {}
                            for _, r in hist_df.iterrows():
                                sess = f"{r.get(col_date, '')}-{r.get(col_time, '')}"
                                session_counts[sess] = session_counts.get(sess, 0) + 1
                                
                            session_colors = ["#ffffff", "#f8fafc"] # ขาว สลับ เทาอ่อนสุด
                            session_idx = 0
                            prev_session = None
                            
                            # สไตล์ของหัวตารางหลัก (Header) - พื้นสว่าง ตัวหนังสือเข้ม ขอบบาง
                            th_style = "background-color:#f8fafc; color:#334155; padding:12px 10px; text-align:center; font-weight:600; font-size:0.85rem; border:1px solid #e2e8f0; border-bottom:2px solid #cbd5e1;"
                            # สไตล์ของเซลล์ข้อมูลปกติ (ข้อความชิดกลาง)
                            td_style = "padding:14px 12px; text-align:center; border-bottom:1px solid #e2e8f0; border-right:1px solid #f1f5f9; color:#334155; font-size:0.85rem;"
                            # สไตล์ของเซลล์ข้อมูลตัวเลข (ชิดขวา)
                            td_num_style = "padding:14px 15px 14px 12px; text-align:right; border-bottom:1px solid #e2e8f0; border-right:1px solid #f1f5f9; color:#334155; font-size:0.85rem;"
                            
                            t_info = df_master[df_master['PEANO หม้อแปลง'].astype(str) == str(search_pea)]
                            t_kva = 100.0
                            if not t_info.empty:
                                try:
                                    t_kva = float(t_info.iloc[-1]['ค่าพิกัด kVA หม้อแปลง'])
                                    if t_kva <= 0: t_kva = 100.0
                                except:
                                    pass
                            
                            rows_html = ""
                            for _, row in hist_df.iterrows():
                                current_session = f"{row.get(col_date, '')}-{row.get(col_time, '')}"
                                
                                is_first_row_of_session = False
                                if current_session != prev_session:
                                    session_idx += 1
                                    prev_session = current_session
                                    is_first_row_of_session = True
                                
                                bg = session_colors[session_idx % 2]
                                feeder_val = str(row.get(col_feeder, '-'))
                                is_total = feeder_val.strip() == "รวม"
                                
                                a_val = row.get(col_a_h, '-')
                                b_val = row.get(col_b_h, '-')
                                c_val = row.get(col_c_h, '-')
                                n_val = row.get(col_n_h, '-') if col_n_h else '-'
                                note_val = row.get(col_note_h, '') if col_note_h else ''
                                
                                # --- คำนวณ Load (kVA), %UF, %Unb ---
                                a_val_num = safe_float(a_val)
                                b_val_num = safe_float(b_val)
                                c_val_num = safe_float(c_val)
                                
                                col_van = "Vใต้หม้อแปลง_an" if "Vใต้หม้อแปลง_an" in hist_df.columns else ""
                                col_vbn = "Vใต้หม้อแปลง_bn" if "Vใต้หม้อแปลง_bn" in hist_df.columns else ""
                                col_vcn = "Vใต้หม้อแปลง_cn" if "Vใต้หม้อแปลง_cn" in hist_df.columns else ""
                                
                                v_an = safe_float(row.get(col_van, 230)) if col_van and pd.notna(row.get(col_van)) and str(row.get(col_van)).strip() != "" else 230.0
                                v_bn = safe_float(row.get(col_vbn, 230)) if col_vbn and pd.notna(row.get(col_vbn)) and str(row.get(col_vbn)).strip() != "" else 230.0
                                v_cn = safe_float(row.get(col_vcn, 230)) if col_vcn and pd.notna(row.get(col_vcn)) and str(row.get(col_vcn)).strip() != "" else 230.0
                                
                                if v_an <= 0: v_an = 230.0
                                if v_bn <= 0: v_bn = 230.0
                                if v_cn <= 0: v_cn = 230.0
                                
                                kva = (a_val_num * v_an + b_val_num * v_bn + c_val_num * v_cn) / 1000.0
                                uf = (kva / t_kva) * 100.0 if t_kva > 0 else 0.0
                                
                                avg_I = (a_val_num + b_val_num + c_val_num) / 3.0
                                if avg_I > 0:
                                    max_dev = max(abs(a_val_num - avg_I), abs(b_val_num - avg_I), abs(c_val_num - avg_I))
                                    unb = (max_dev / avg_I) * 100.0
                                else:
                                    unb = 0.0
                                
                                kva_str = f"<span style='font-weight:600; color:#0f172a;'>{kva:.2f}</span>"
                                uf_str = f"<span style='font-weight:600; color:#0f172a;'>{uf:.2f}%</span>"
                                
                                # --- Helper สำหรับปรับแต่งสีตัวเลข ---
                                def fmt_v(v, color_val, is_bold=True):
                                    if v in ("0", "-", "", "0.0"):
                                        return f"<span style='color:#cbd5e1; font-weight:400;'>-</span>"
                                    fw = "600" if is_bold else "500"
                                    # เอา Span ครอบไว้เฉยๆ ไม่ต้องจัด Alignment ในนี้
                                    return f"<span style='color:{color_val}; font-weight:{fw};'>{v}</span>"

                                # --- Voltage Data ---
                                vab_t = str(row.get("V_ab (ใต้หม้อแปลง)", "")).strip()
                                vbc_t = str(row.get("V_bc (ใต้หม้อแปลง)", "")).strip()
                                vca_t = str(row.get("V_ca (ใต้หม้อแปลง)", "")).strip()
                                van_t = str(row.get("V_an (ใต้หม้อแปลง)", "")).strip()
                                vbn_t = str(row.get("V_bn (ใต้หม้อแปลง)", "")).strip()
                                vcn_t = str(row.get("V_cn (ใต้หม้อแปลง)", "")).strip()
                                
                                vab_e = str(row.get("V_ab (ปลายสาย)", "")).strip()
                                vbc_e = str(row.get("V_bc (ปลายสาย)", "")).strip()
                                vca_e = str(row.get("V_ca (ปลายสาย)", "")).strip()
                                van_e = str(row.get("V_an (ปลายสาย)", "")).strip()
                                vbn_e = str(row.get("V_bn (ปลายสาย)", "")).strip()
                                vcn_e = str(row.get("V_cn (ปลายสาย)", "")).strip()
                                
                                # Styling เฉพาะคอลัมน์สีตัวเลข โดยใช้ td_num_style เพื่อให้ตัวเลขชิดขวา
                                style_ll = td_num_style # แรงดันเฟส-เฟส
                                style_ln = td_num_style # แรงดันเฟส-นิวทรัล
                                style_i_a = td_num_style + "color:#dc2626; font-weight:600;" 
                                style_i_b = td_num_style + "color:#16a34a; font-weight:600;" 
                                style_i_c = td_num_style + "color:#2563eb; font-weight:600;" 
                                style_i_n = td_num_style + "color:#475569; font-weight:600;" 
                                
                                td_v_t = f"<td style='{style_ll}'>{fmt_v(vab_t, '#0284c7')}</td><td style='{style_ll}'>{fmt_v(vbc_t, '#0284c7')}</td><td style='{style_ll}'>{fmt_v(vca_t, '#0284c7')}</td><td style='{style_ln}'>{fmt_v(van_t, '#64748b', False)}</td><td style='{style_ln}'>{fmt_v(vbn_t, '#64748b', False)}</td><td style='{style_ln}'>{fmt_v(vcn_t, '#64748b', False)}</td>"
                                td_v_e = f"<td style='{style_ll}'>{fmt_v(vab_e, '#0284c7')}</td><td style='{style_ll}'>{fmt_v(vbc_e, '#0284c7')}</td><td style='{style_ll}'>{fmt_v(vca_e, '#0284c7')}</td><td style='{style_ln}'>{fmt_v(van_e, '#64748b', False)}</td><td style='{style_ln}'>{fmt_v(vbn_e, '#64748b', False)}</td><td style='{style_ln}'>{fmt_v(vcn_e, '#64748b', False)}</td>"
                                td_i = f"<td style='{style_i_a}'>{fmt_v(a_val, '#dc2626')}</td><td style='{style_i_b}'>{fmt_v(b_val, '#16a34a')}</td><td style='{style_i_c}'>{fmt_v(c_val, '#2563eb')}</td><td style='{style_i_n}'>{fmt_v(n_val, '#475569')}</td>"
                                
                                unb_str = f"<span style='font-weight:600; color:#0f172a;'>{unb:.2f}%</span>"
                                
                                # ปรับ kVA, %UF, %Unb ให้ชิดขวาด้วย td_num_style
                                kva_td = f"<td style='{td_num_style}'>{kva_str}</td>"
                                uf_td = f"<td style='{td_num_style}'>{uf_str}</td>"
                                unb_td = f"<td style='{td_num_style}'>{unb_str}</td>"
                                td_img = ""
                                if is_first_row_of_session:
                                    img_url_str = str(row.get("รูปถ่าย", ""))
                                    img_link = "-"
                                    if img_url_str:
                                        urls = [u.strip() for u in img_url_str.split(",") if u.strip().startswith("http")]
                                        if urls:
                                            img_elements = []
                                            for i, u in enumerate(urls):
                                                direct_url = u
                                                import re
                                                match = re.search(r'(?:/d/|id=)([-\w]{25,})', u)
                                                if match:
                                                    file_id = match.group(1)
                                                    b64_img = fetch_google_drive_image_base64(file_id)
                                                    if b64_img:
                                                        direct_url = b64_img
                                                    else:
                                                        direct_url = f"https://drive.google.com/uc?id={file_id}"
                                                img_elements.append(f"<a href='{u}' target='_blank' style='flex: 1; display: block; margin: 0; text-decoration: none;'><img src='{direct_url}' style='width: 100%; height: 100%; min-height: 150px; object-fit: cover; display: block; border-radius:4px;' title='คลิกเพื่อดูรูปเต็ม' alt='🖼️ ดูรูปภาพ'></a>")
                                            img_link = "<div style='display:flex; flex-direction:row; width:100%; height:100%; align-items: stretch; gap:4px; padding:4px;'>" + "".join(img_elements) + "</div>"
                                    
                                    rowspan = session_counts[current_session]
                                    td_img = f"<td rowspan='{rowspan}' style='padding: 0; text-align:center; border-bottom:1px solid #e2e8f0; vertical-align:middle; background: #ffffff; border-left: 1px solid #e2e8f0; width: 150px;'>{img_link}</td>"
                                
                                td_manage = ""
                                if is_first_row_of_session:
                                    sess_date = row.get(col_date, '')
                                    sess_time = row.get(col_time, '')
                                    edit_btn = f"<a href='#edit-{session_idx}' style='background-color:#8b5cf6; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600; box-sizing:border-box; box-shadow: 0 1px 2px rgba(0,0,0,0.1); text-decoration:none; display:inline-block; white-space:nowrap;'>✏️ แก้ไข</a>"
                                tap_td_h = f"<td style='{td_style} font-weight:600;'>{row.get(col_tap_h, '-')}</td>" if col_tap_h else ""
                                
                                if is_total:
                                    td_total = td_style + "font-weight:700; background-color:#f3f0ff; border-top:2px solid #d8b4fe; border-bottom:2px solid #d8b4fe;"
                                    td_total_num = td_num_style + "font-weight:700; background-color:#f3f0ff; border-top:2px solid #d8b4fe; border-bottom:2px solid #d8b4fe;"
                                    feeder_display = f"<span style='color:#4b0082; font-weight:700;'>✨ สรุปผลรวมหม้อแปลง รอบที่ {session_idx} ➡️</span>"
                                    
                                    td_i_total = f"<td style='{td_total_num}'>{fmt_v(a_val, '#dc2626')}</td><td style='{td_total_num}'>{fmt_v(b_val, '#16a34a')}</td><td style='{td_total_num}'>{fmt_v(c_val, '#2563eb')}</td><td style='{td_total_num}'>{fmt_v(n_val, '#475569')}</td>"
                                    
                                    colspan_val = 16 if is_hist_new_format else 15
                                    rows_html += f"<tr style='background:#f3f0ff;' onmouseover=\"this.style.background='#ede9fe'\" onmouseout=\"this.style.background='#f3f0ff'\"><td colspan='{colspan_val}' style='{td_total}text-align:right;'>{feeder_display}</td>{td_i_total}<td style='{td_total_num}'>{kva_str}</td><td style='{td_total_num}'>{uf_str}</td><td style='{td_total_num}'>{unb_str}</td><td style='{td_total}text-align:left;color:#64748b;'>{note_val}</td>{td_img}</tr>"
                                else:
                                    rows_html += f"<tr style='background:{bg};' onmouseover=\"this.style.background='#f1f5f9'\" onmouseout=\"this.style.background='{bg}'\"><td style='{td_style}'>{row.get(col_date, '-')}</td><td style='{td_style}'>{row.get(col_time, '-')}</td><td style='{td_style} font-weight:600; color:#1e293b;'>{feeder_val}</td>{tap_td_h}{td_v_t}{td_v_e}{td_i}{kva_td}{uf_td}{unb_td}<td style='{td_style}text-align:left;color:#64748b;'>{note_val}</td>{td_img}</tr>"
                            
                            tap_th_h = f"<th rowspan='2' style=\"{th_style}\">🎛️ แท็ป</th>" if is_hist_new_format else ""
                            
                            # สไตล์ Sub-header (ยกเลิกสีดำเข้ม เปลี่ยนเป็นสีเทาสว่าง)
                            bg_sub = "background-color:#f1f5f9;" 
                            sub_th_base = f"{bg_sub} padding:10px 8px; font-size:0.75rem; border:1px solid #e2e8f0; font-weight:600; text-align:center;"
                            
                            # ✨ สร้าง Base ใหม่ สำหรับตัวเลข (ชิดขวา)
                            sub_th_num_base = f"{bg_sub} padding:10px 15px 10px 8px; font-size:0.75rem; border:1px solid #e2e8f0; font-weight:600; text-align:right;"
                            
                            sub_th_style_ll = f"{sub_th_base} color:#0284c7;"
                            sub_th_style_ln = f"{sub_th_base} color:#64748b;"
                            
                            # ✨ เปลี่ยนมาใช้ sub_th_num_base กับกระแส
                            sub_th_style_i_a = f"{sub_th_num_base} color:#dc2626;"
                            sub_th_style_i_b = f"{sub_th_num_base} color:#16a34a;"
                            sub_th_style_i_c = f"{sub_th_num_base} color:#2563eb;"
                            sub_th_style_i_n = f"{sub_th_num_base} color:#475569;"

                            header_html = (
                                "<thead>"
                                "<tr>"
                                f"<th rowspan='2' style='{th_style} white-space: nowrap;'>📅 วันที่</th>"
                                f"<th rowspan='2' style='{th_style} white-space: nowrap;'>🕐 เวลา</th>"
                                f"<th rowspan='2' style='{th_style} white-space: nowrap;'>🔌 ฟีดเดอร์</th>"
                                f"{tap_th_h}"
                                f"<th colspan='6' style='{th_style}'>แรงดันใต้หม้อแปลง (V)</th>"
                                f"<th colspan='6' style='{th_style}'>แรงดันปลายสาย (V)</th>"
                                f"<th colspan='4' style='{th_style}'>กระแสไฟฟ้า (A)</th>"
                                f"<th rowspan='2' style='{th_style}'>โหลด (kVA)</th>"
                                f"<th rowspan='2' style='{th_style}'>%UF</th>"
                                f"<th rowspan='2' style='{th_style}'>%Unb</th>"
                                f"<th rowspan='2' style='{th_style}'>📝 หมายเหตุ</th>"
                                f"<th rowspan='2' style='{th_style}'>📸 รูปถ่าย</th>"
                                "</tr>"
                                "<tr>"
                                f"<th style='{sub_th_style_ll}'>A-B</th><th style='{sub_th_style_ll}'>B-C</th><th style='{sub_th_style_ll}'>C-A</th><th style='{sub_th_style_ln}'>A-N</th><th style='{sub_th_style_ln}'>B-N</th><th style='{sub_th_style_ln}'>C-N</th>"
                                f"<th style='{sub_th_style_ll}'>A-B</th><th style='{sub_th_style_ll}'>B-C</th><th style='{sub_th_style_ll}'>C-A</th><th style='{sub_th_style_ln}'>A-N</th><th style='{sub_th_style_ln}'>B-N</th><th style='{sub_th_style_ln}'>C-N</th>"
                                f"<th style='{sub_th_style_i_a}'>A</th><th style='{sub_th_style_i_b}'>B</th><th style='{sub_th_style_i_c}'>C</th><th style='{sub_th_style_i_n}'>N</th>"
                                "</tr>"
                                "</thead>"
                            )
                            
                            # ปรับสีเส้นกรอบตารางด้านนอกสุดให้กลมกลืน
                            full_html = f"<div style='border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05); background-color:#ffffff;'><div style='overflow-x:auto;'><table style='width:100%; border-collapse:collapse; min-width:1400px; text-align:center;'>{header_html}<tbody>{rows_html}</tbody></table></div></div>"
                            
                            st.markdown(full_html, unsafe_allow_html=True)

                            st.markdown("<br>", unsafe_allow_html=True)
                            
                            # --- Smart Alerts (ดึงจากฟังก์ชันกลาง) ---
                            try:
                                pct_load, pct_unb = calculate_transformer_status(df_master, df_record, search_pea)
                                if pct_load is not None and pct_unb is not None:
                                    alerts = []
                                    
                                    # --- [เพิ่มใหม่] ตรวจสอบเหมืองขุด Bitcoin ---
                                    try:
                                        col_feeder_alert = col_feeder
                                        col_a_alert = col_a_h
                                        col_b_alert = col_b_h
                                        col_c_alert = col_c_h
                                        col_n_alert = col_n_h
                                        
                                        # หา record ที่เป็น "รวม" 
                                        total_rows = hist_df[hist_df[col_feeder_alert].astype(str).str.strip() == "รวม"]
                                        if not total_rows.empty:
                                            latest_total = total_rows.iloc[-1]
                                            a_val = safe_float(latest_total.get(col_a_alert, 0))
                                            b_val = safe_float(latest_total.get(col_b_alert, 0))
                                            c_val = safe_float(latest_total.get(col_c_alert, 0))
                                            n_val = safe_float(latest_total.get(col_n_alert, 0)) if col_n_alert else 0
                                            
                                            is_btc, harm_amp, in_cal = check_bitcoin_miner(a_val, b_val, c_val, n_val)
                                            if is_btc:
                                                alerts.append(f"<li>👾 <b style='color:#842029;'>Suspicious Load (Bitcoin?):</b> พบกระแสนิวทรอลสูงผิดปกติ วัดได้ {n_val:.2f}A แต่คำนวณทางเวกเตอร์ได้เพียง {in_cal:.2f}A (กระแส Harmonic แฝงสูงถึง {harm_amp:.2f}A) มีโอกาสพบโหลดกลุ่มเหมืองขุดสูงมาก</li>")
                                    except Exception as e:
                                        pass
                                        
                                    # --- [เพิ่มใหม่] ตรวจสอบไฟตก (Undervoltage) ---
                                    try:
                                        col_van = "V_an (ใต้หม้อแปลง)" if "V_an (ใต้หม้อแปลง)" in hist_df.columns else "V_an" if "V_an" in hist_df.columns else "Vใต้หม้อแปลง_an" if "Vใต้หม้อแปลง_an" in hist_df.columns else ""
                                        col_vbn = "V_bn (ใต้หม้อแปลง)" if "V_bn (ใต้หม้อแปลง)" in hist_df.columns else "V_bn" if "V_bn" in hist_df.columns else "Vใต้หม้อแปลง_bn" if "Vใต้หม้อแปลง_bn" in hist_df.columns else ""
                                        col_vcn = "V_cn (ใต้หม้อแปลง)" if "V_cn (ใต้หม้อแปลง)" in hist_df.columns else "V_cn" if "V_cn" in hist_df.columns else "Vใต้หม้อแปลง_cn" if "Vใต้หม้อแปลง_cn" in hist_df.columns else ""
                                        
                                        if col_van and col_vbn and col_vcn and 'total_rows' in locals() and not total_rows.empty:
                                            latest_total = total_rows.iloc[-1]
                                            v_an = safe_float(latest_total.get(col_van, 230))
                                            v_bn = safe_float(latest_total.get(col_vbn, 230))
                                            v_cn = safe_float(latest_total.get(col_vcn, 230))
                                            
                                            from core import check_undervoltage
                                            is_uv, drop_phases, min_v = check_undervoltage(v_an, v_bn, v_cn, threshold=207.0)
                                            if is_uv:
                                                alerts.append(f"<li>📉 <b style='color:#842029;'>Undervoltage (ไฟตก):</b> พบแรงดันเฟส {', '.join(drop_phases)} ต่ำผิดปกติ (วัดได้ {min_v}V ต่ำกว่า 207V) ควรตรวจสอบโหลดหรือปรับแท็บ</li>")
                                    except Exception as e:
                                        pass
                                    # ----------------------------------------
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
                        # -----------------------------------------------
                        col_btn1, col_btn2, col_btn3 = st.columns(3)
                        with col_btn1:
                            if st.button("🩺 บันทึกการตรวจวัดโหลดรอบใหม่", type="primary", use_container_width=True):
                                js_new = f"""
                                <script>
                                    const host = window.parent.location.hostname;
                                    const url = "http://" + host + ":8501/?pea={search_pea}";
                                    window.parent.open(url, "_blank");
                                </script>
                                """
                                components.html(js_new, height=0)
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
                        
                    phase_choice = st.selectbox("ระบบเฟส", ["หม้อแปลง 3 Phase", "หม้อแปลง 1 Phase"])
                    reg_phase = "3" if "3 Phase" in phase_choice else "1"
                    
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
                                    elif col_str in ["ระบบเฟส", "ระบบ"]:
                                        new_row.append(reg_phase)
                                    else:
                                        new_row.append("")
                                    
                            if add_master_data_to_sheet(client, SHEET_NAME, new_row):
                                st.success(f"🎉 ลงทะเบียนหม้อแปลง {reg_pea} สำเร็จแล้ว! กำลังเปิดหน้าประวัติ...")
                                st.session_state.page = "Profile"
                                st.session_state.selected_pea_for_profile = reg_pea.strip()
                                time.sleep(1)
                                st.rerun()

        else:
            st.error("ข้อผิดพลาด: ชื่อหัวคอลัมน์ (บรรทัดแรกสุด) ในชีต MasterData ไม่ตรงกับที่ระบบต้องการครับ")
            st.warning(f"📌 คอลัมน์ที่ระบบต้องการคือ: {required_cols}")
            st.info(f"📄 คอลัมน์ที่มีอยู่ในชีตของคุณตอนนี้คือ: {df_master.columns.tolist()}")
            st.write("วิธีแก้: รบกวนเปลี่ยนชื่อหัวคอลัมน์ใน Google Sheets ให้ตรงกับที่ระบบต้องการ (ระวังเรื่องการเว้นวรรค) หรือพิมพ์บอกผมว่าคุณใช้ชื่อคอลัมน์ว่าอะไร เพื่อให้ผมแก้โค้ดให้ตรงกันครับ")
