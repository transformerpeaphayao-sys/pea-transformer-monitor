import streamlit as st
import streamlit.components.v1 as components
from core import *
import os
import pytz

st.set_page_config(page_title='ระบบบันทึกและตรวจสอบโหลดหม้อแปลง PEA', page_icon='⚡', layout='wide', initial_sidebar_state='collapsed')
load_custom_css()
components.html('''<script>window.addEventListener('offline', function(e) { alert('⚠️ สัญญาณอินเทอร์เน็ตขาดหาย!'); }); window.addEventListener('online', function(e) { alert('✅ กลับมาออนไลน์แล้ว'); });</script>''', height=0)
if 'page' not in st.session_state:
    st.session_state.page = "Map"
if 'selected_pea_from_map' not in st.session_state:
    st.session_state.selected_pea_from_map = None


# ตรวจสอบค่าจากลิงก์คลิก (ผ่าน URL)
query_pea = st.query_params.get("pea")
query_action = st.query_params.get("action")
query_date = st.query_params.get("date")
query_time = st.query_params.get("time")
query_profile = st.query_params.get("profile_pea")

if query_pea:
    st.session_state.page = "Form"
    st.session_state.selected_pea_from_map = query_pea
    
    if query_action == 'edit':
        st.session_state.edit_mode = True
        st.session_state.edit_pea = query_pea
        st.session_state.edit_date = query_date if query_date else ""
        st.session_state.edit_time = query_time if query_time else ""

if query_profile:
    st.session_state.page = "Profile"
    st.session_state.selected_pea_for_profile = query_profile

# ล้าง Query Params รวดเดียวเพื่อป้องกัน Rerun Loop
if st.query_params:
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
    
    

    st.markdown("---")
    st.markdown(f"""
    <div style="text-align:center; padding: 0.5rem 0; opacity: 0.5; font-size: 0.7rem; color: white;">
        📅 {datetime.datetime.now(pytz.timezone('Asia/Bangkok')).strftime('%d/%m/%Y %H:%M')}
    </div>
    """, unsafe_allow_html=True)

# --- Scroll to top on page change ---
if "last_page" not in st.session_state:
    st.session_state.last_page = st.session_state.page

if st.session_state.last_page != st.session_state.page:
    st.session_state.last_page = st.session_state.page
    # ใส่ค่าเวลาสุ่มลงไปในโค้ด เพื่อบังคับให้ Streamlit รัน Script ทุกครั้งที่โค้ดเปลี่ยน (แก้ปัญหาแคช)
    components.html(f"""
        <script>
            // {time.time()}
            window.parent.scrollTo(0, 0);
            window.parent.document.documentElement.scrollTop = 0;
            const main = window.parent.document.querySelector('.main');
            if (main) {{ main.scrollTo(0, 0); }}
            const block = window.parent.document.querySelector('.block-container');
            if (block) {{ block.scrollIntoView(); }}
        </script>
    """, height=0)

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
            col_pea_record = "PEA NO" if "PEA NO" in df_record.columns else df_record.columns[2] if len(df_record.columns) > 2 else "PEA NO"
            df_task = load_task_data(client, SHEET_NAME)
            
            # คำนวณสถานะหมุดแต่ละเครื่อง
            # 1. หารายการล่าสุดที่ถูกบันทึก (Record Data)
            record_latest = {}
            if not df_record.empty and col_pea_record in df_record.columns:
                # พยายามหาวันที่/เวลา เพื่อเปรียบเทียบ (ถ้าไม่มี ให้ถือว่าบันทึกแล้วก็พอ)
                for _, row in df_record.iterrows():
                    pea = str(row.get(col_pea_record, '')).strip()
                    record_latest[pea] = True
            
            completed_peas = list(record_latest.keys())
            
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
            # หน้าที่ 1: MAP PAGE
            # ==============================
            if st.session_state.page == "Map":
                col_map1, col_map2 = st.columns([3, 1])
                with col_map1:
                    st.markdown("#### 🗺️ แผนที่ตำแหน่งหม้อแปลง")
                    st.caption("💡 คลิกที่หมุดเพื่อดูข้อมูลและนำทางไปยังหม้อแปลง (🔴=ยังไม่ตรวจ, 🟠=สั่งตรวจสอบซ้ำ)")
                with col_map2:
                    st.markdown("<div style='margin-top:0.5rem;'></div>", unsafe_allow_html=True)
                    if st.button("🔄 รีเฟรช", use_container_width=True):
                        load_completed_data.clear()
                        load_task_data.clear()
                        load_master_data.clear()
                        st.rerun()
                
                
                if 'LATITUDE' in df_pending.columns and 'LONGITUDE' in df_pending.columns:
                    map_data = df_pending.dropna(subset=['LATITUDE', 'LONGITUDE'])
                    
                    # --- [เพิ่มใหม่] ตัวกรองประเภทหมุด ---
                    map_filter = st.segmented_control(
                        "กรองประเภทงาน:",
                        options=["ทั้งหมด", "🔴 ยังไม่ตรวจ", "🟠 สั่งตรวจสอบซ้ำ"],
                        default="ทั้งหมด",
                        label_visibility="collapsed"
                    )
                    if map_filter is None: 
                        map_filter = "ทั้งหมด"
                    
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
                st.markdown("#### ฟอร์มบันทึกการวัดโหลดหม้อแปลง")
                
                # --- จัดการโหมดแก้ไข (Edit Mode) ---
                is_edit_mode = st.session_state.get('edit_mode', False)
                edit_data = {}
                
                if is_edit_mode:
                    st.info(f"✏️ **กำลังแก้ไขข้อมูล:** PEA {st.session_state.edit_pea} (รอบเดิม: {st.session_state.edit_date} {st.session_state.edit_time})")
                    if st.button("❌ ยกเลิกการแก้ไข"):
                        st.session_state.edit_mode = False
                        st.rerun()
                        
                    # ดึงข้อมูลเดิมมาเตรียมไว้สำหรับกรอกลงฟอร์ม
                    old_img_url = "" # [เพิ่มใหม่] ตัวแปรเก็บลิงก์รูปเก่า
                    old_df = df_record[(df_record[col_pea_record].astype(str) == st.session_state.edit_pea) &
                                       (df_record['วันที่'].astype(str) == st.session_state.edit_date) &
                                       (df_record['เวลา'].astype(str) == st.session_state.edit_time)]
                    for _, r in old_df.iterrows():
                        # [เพิ่มใหม่] ตรวจสอบและเก็บลิงก์รูปเก่า
                        if str(r.get("รูปถ่าย", "")) != "" and str(r.get("รูปถ่าย", "")) != "nan":
                            old_img_url = str(r.get("รูปถ่าย", ""))
                            
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

                # === โหมดการทำงาน ===
                st.markdown('<div class="section-card"><div class="pea-card-header">โหมดการบันทึกข้อมูล</div>', unsafe_allow_html=True)
                task_mode = st.segmented_control(
                    "เลือกฟังก์ชันที่ต้องการบันทึก:",
                    options=["วัดกระแสไฟฟ้า (รวดเร็ว)", "วัดโหลด + วิเคราะห์ไฟตก (ครบชุด)"],
                    default="วัดโหลด + วิเคราะห์ไฟตก (ครบชุด)"
                )
                if task_mode is None:
                    task_mode = "วัดโหลด + วิเคราะห์ไฟตก (ครบชุด)"
                st.markdown('</div>', unsafe_allow_html=True)

                # === Section 1: ข้อมูลทั่วไป ===
                st.markdown('<div class="section-card"><div class="pea-card-header">ข้อมูลทั่วไป</div>', unsafe_allow_html=True)
                
                col_pea1, col_pea2 = st.columns(2)
                with col_pea1:
                    thai_time = datetime.datetime.now(pytz.timezone('Asia/Bangkok'))
                    def_date = thai_time.date()
                    def_time = thai_time.time()
                    
                    if is_edit_mode:
                        try:
                            def_date = datetime.datetime.strptime(st.session_state.edit_date, "%d/%m/%Y").date()
                            def_time = datetime.datetime.strptime(st.session_state.edit_time, "%H:%M:%S").time()
                        except: pass
                        
                    record_date = st.date_input("วันที่", def_date)
                    record_time = st.time_input("เวลา", value=def_time, step=60)
                
                with col_pea2:
                    pea_list = df_master['PEANO หม้อแปลง'].astype(str).unique().tolist()
                    default_idx = 0
                    if is_edit_mode and st.session_state.edit_pea in pea_list:
                        default_idx = pea_list.index(st.session_state.edit_pea)
                    elif st.session_state.selected_pea_from_map and st.session_state.selected_pea_from_map in pea_list:
                        default_idx = pea_list.index(st.session_state.selected_pea_from_map)
                    
                    if pea_list:
                        selected_pea = st.selectbox("ค้นหา/เลือก PEANO หม้อแปลง", options=pea_list, index=default_idx, disabled=is_edit_mode)
                        if selected_pea:
                            t_info = df_master[df_master['PEANO หม้อแปลง'].astype(str) == selected_pea].iloc[0]
                            phase = t_info.get('ระบบเฟส', '-')
                            kva = t_info.get('ค่าพิกัด kVA หม้อแปลง', '-')
                            loc = t_info.get('สถานที่', '-')
                            st.markdown(f"""
                            <div class="tr-info-banner">
                                <div class="tr-info-item"><div class="lbl">ระบบเฟส</div><div class="val">{phase}</div></div>
                                <div class="tr-info-item"><div class="lbl">พิกัด</div><div class="val">{kva} kVA</div></div>
                                <div class="tr-info-item"><div class="lbl">สถานที่</div><div class="val">{loc}</div></div>
                            </div>
                            """, unsafe_allow_html=True)
                    else:
                        st.info("ไม่มีหม้อแปลงคงเหลือให้เลือก")
                        selected_pea = None
                
                tap_val = st.selectbox("แท็ปหม้อแปลง (Tap)", options=["1", "2", "3", "4", "5"], index=2)
                st.markdown('</div>', unsafe_allow_html=True)

                # === Section 2: เลือกฟีดเดอร์ ===
                st.markdown('<div class="section-card"><div class="pea-card-header">เลือกฟีดเดอร์ที่ต้องการบันทึก</div>', unsafe_allow_html=True)
                
                # จัด Layout สำหรับมือถือให้เป็น 2 แถว เพื่อไม่ให้เบียดกัน
                chk_c1, chk_c2, chk_c3 = st.columns(3)
                f1_checked = chk_c1.checkbox("F1", value=("F1" in edit_data))
                f2_checked = chk_c2.checkbox("F2", value=("F2" in edit_data))
                f3_checked = chk_c3.checkbox("F3", value=("F3" in edit_data))
                
                chk_c4, chk_c5, _ = st.columns(3)
                f4_checked = chk_c4.checkbox("F4", value=("F4" in edit_data))
                total_checked = False
                st.markdown('</div>', unsafe_allow_html=True)
                
                selected_feeders = []
                if f1_checked: selected_feeders.append("F1")
                if f2_checked: selected_feeders.append("F2")
                if f3_checked: selected_feeders.append("F3")
                if f4_checked: selected_feeders.append("F4")
                
                # === Section 3: กรอกข้อมูลแต่ละฟีดเดอร์ ===
                feeder_inputs = {}
                for f_name in selected_feeders:
                    with st.container(border=True):
                        st.markdown(f"<div class='feeder-card-title'>ฟีดเดอร์ {f_name}</div>", unsafe_allow_html=True)
                        
                        # Initialize variables to 0
                        vt_ab = vt_bc = vt_ca = 0.0
                        vt_an = vt_bn = vt_cn = 0.0
                        ve_ab = ve_bc = ve_ca = 0.0
                        ve_an = ve_bn = ve_cn = 0.0
                    
                        if "วิเคราะห์ไฟตก" in task_mode:
                            st.markdown("**แรงดันใต้หม้อแปลง (V)**")
                            c1, c2, c3 = st.columns(3)
                            vt_ab = c1.number_input("V_ab", min_value=0.0, step=1.0, value=None, key=f"{f_name}_vt_ab")
                            vt_bc = c2.number_input("V_bc", min_value=0.0, step=1.0, value=None, key=f"{f_name}_vt_bc")
                            vt_ca = c3.number_input("V_ca", min_value=0.0, step=1.0, value=None, key=f"{f_name}_vt_ca")
                        
                            c4, c5, c6 = st.columns(3)
                            vt_an = c4.number_input("V_an", min_value=0.0, step=1.0, value=None, key=f"{f_name}_vt_an")
                            vt_bn = c5.number_input("V_bn", min_value=0.0, step=1.0, value=None, key=f"{f_name}_vt_bn")
                            vt_cn = c6.number_input("V_cn", min_value=0.0, step=1.0, value=None, key=f"{f_name}_vt_cn")
                        
                            with st.expander("🔽 แรงดันปลายสาย (V) - คลิกเพื่อกรอกข้อมูล", expanded=False):
                                c7, c8, c9 = st.columns(3)
                                ve_ab = c7.number_input("V_ab (ปลายสาย)", min_value=0.0, step=1.0, value=None, key=f"{f_name}_ve_ab")
                                ve_bc = c8.number_input("V_bc (ปลายสาย)", min_value=0.0, step=1.0, value=None, key=f"{f_name}_ve_bc")
                                ve_ca = c9.number_input("V_ca (ปลายสาย)", min_value=0.0, step=1.0, value=None, key=f"{f_name}_ve_ca")
                            
                                c10, c11, c12 = st.columns(3)
                                ve_an = c10.number_input("V_an (ปลายสาย)", min_value=0.0, step=1.0, value=None, key=f"{f_name}_ve_an")
                                ve_bn = c11.number_input("V_bn (ปลายสาย)", min_value=0.0, step=1.0, value=None, key=f"{f_name}_ve_bn")
                                ve_cn = c12.number_input("V_cn (ปลายสาย)", min_value=0.0, step=1.0, value=None, key=f"{f_name}_ve_cn")
                    
                        st.markdown("**กระแสไฟฟ้า (A)**")
                    
                        # ปรับเป็น 2x2 Grid ประหยัดพื้นที่แนวตั้งบนมือถือ และช่องใหญ่พอกดได้
                        col_i1, col_i2 = st.columns(2)
                        val_a = col_i1.number_input(f"Phase A", min_value=0.0, step=0.1, key=f"{f_name}_A", value=edit_data.get(f_name, {}).get("A", None), help="กระแสเฟส A")
                        val_b = col_i2.number_input(f"Phase B", min_value=0.0, step=0.1, key=f"{f_name}_B", value=edit_data.get(f_name, {}).get("B", None), help="กระแสเฟส B")
                    
                        col_i3, col_i4 = st.columns(2)
                        val_c = col_i3.number_input(f"Phase C", min_value=0.0, step=0.1, key=f"{f_name}_C", value=edit_data.get(f_name, {}).get("C", None), help="กระแสเฟส C")
                        val_n = col_i4.number_input(f"Neutral (N)", min_value=0.0, step=0.1, key=f"{f_name}_N", value=edit_data.get(f_name, {}).get("N", None), help="กระแสนิวทรอล")
                    
                        cable_sz = st.text_input(f"ขนาดสายแรงต่ำ {f_name} (ตร.มม.)", key=f"{f_name}_cable", placeholder="เช่น 25, 35, 50...")
                        note = st.text_input(f"หมายเหตุ {f_name}", key=f"{f_name}_note", value=edit_data.get(f_name, {}).get("note", ""), placeholder=f"หมายเหตุเฉพาะฟีดเดอร์นี้...")
                    
                        feeder_inputs[f_name] = {
                            "A": val_a or 0.0, "B": val_b or 0.0, "C": val_c or 0.0, "N": val_n or 0.0, 
                            "cable": cable_sz,
                            "vt_ab": vt_ab, "vt_bc": vt_bc, "vt_ca": vt_ca,
                            "vt_an": vt_an, "vt_bn": vt_bn, "vt_cn": vt_cn,
                            "ve_ab": ve_ab, "ve_bc": ve_bc, "ve_ca": ve_ca,
                            "ve_an": ve_an, "ve_bn": ve_bn, "ve_cn": ve_cn,
                            "note": note
                        }
                
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
                    else:
                        st.info("กรุณาเลือกฟีดเดอร์อย่างน้อย 1 รายการ หรือเลือก 'รวม'")
                        
                if len(selected_feeders) > 0 or total_checked:
                    # --- Calculate Stats for Total ---
                    def get_valid_voltage(key):
                        for d in feeder_inputs.values():
                            val = d.get(key)
                            if val is not None and str(val).strip() != "":
                                try:
                                    if float(val) > 0:
                                        return float(val)
                                except:
                                    pass
                        return 230.0

                    v_an_tot = get_valid_voltage("vt_an")
                    v_bn_tot = get_valid_voltage("vt_bn")
                    v_cn_tot = get_valid_voltage("vt_cn")

                    tot_kva = (tot_a * v_an_tot + tot_b * v_bn_tot + tot_c * v_cn_tot) / 1000.0
                    
                    t_info = df_master[df_master['PEANO หม้อแปลง'].astype(str) == str(selected_pea)]
                    t_kva = 100.0
                    if not t_info.empty:
                        try:
                            t_kva = float(t_info.iloc[0]['ค่าพิกัด kVA หม้อแปลง'])
                            if t_kva <= 0: t_kva = 100.0
                        except:
                            pass
                    
                    tot_uf = (tot_kva / t_kva) * 100.0 if t_kva > 0 else 0.0
                    
                    avg_i = (tot_a + tot_b + tot_c) / 3.0
                    if avg_i > 0:
                        max_dev = max(abs(tot_a - avg_i), abs(tot_b - avg_i), abs(tot_c - avg_i))
                        tot_unb = (max_dev / avg_i) * 100.0
                    else:
                        tot_unb = 0.0

                    st.markdown("<hr style='margin:10px 0;'>", unsafe_allow_html=True)
                    metrics_cols = st.columns(3)
                    metrics_cols[0].metric("โหลดรวม (kVA)", f"{tot_kva:.2f}")
                    metrics_cols[1].metric("Utilization Factor (%UF)", f"{tot_uf:.2f}%")
                    metrics_cols[2].metric("Current Unbalance (%Unb)", f"{tot_unb:.2f}%")
                    
                    # --- แจ้งเตือนความเสี่ยงลักใช้ไฟ / ขุดบิตคอยน์ (Harmonic Risk) ---
                    if tot_a > 0 or tot_b > 0 or tot_c > 0:
                        is_risk, n_theory, diff = check_bitcoin_harmonic_risk(tot_a, tot_b, tot_c, tot_n)
                        if is_risk:
                            st.error(f"เฝ้าระวังความเสี่ยงลักใช้ไฟ / ขุดบิตคอยน์!\n\nพบกระแส N ({tot_n:.2f} A) สูงผิดปกติเมื่อเทียบกับความสมดุลของ 3 เฟส (ค่า N ทฤษฎีควรอยู่ประมาณ {n_theory:.2f} A)\n\n*ความเบี่ยงเบน Harmonic: {diff:.2f} A*")

                    # --- แจ้งเตือนไฟเกิน (Overvoltage) ---
                    if v_an_tot > 253.0 or v_bn_tot > 253.0 or v_cn_tot > 253.0:
                        st.error("แจ้งเตือนไฟเกิน! พบแรงดันสูงผิดปกติ (เกิน 253V) ควรตรวจสอบการปรับแท็บ (Tap) หรือสายสายนิวทรอล")

                        
                # === Section 5: รูปถ่ายหน้างาน ===
                st.markdown("""
                <div class="feeder-card">
                    <div class="feeder-card-title">ถ่ายรูปหน้างาน / อัปโหลด (อุปกรณ์เสริม)</div>
                </div>
                """, unsafe_allow_html=True)
                
                uploaded_imgs = st.file_uploader("แตะเพื่อเปิดกล้องถ่ายรูป หรือเลือกรูปจากคลังภาพ", type=["jpg", "jpeg", "png"], accept_multiple_files=True)
                
                final_img_bytes_list = []
                if uploaded_imgs:
                    for img in uploaded_imgs:
                        # --- นำภาพไปบีบอัดก่อนเก็บลงลิสต์ ---
                        compressed_bytes = compress_image(img.getvalue())
                        final_img_bytes_list.append(compressed_bytes)
                
                st.markdown("<br>", unsafe_allow_html=True)
                tot_note = st.text_input("หมายเหตุ (รวม)", key="tot_note_global", value=edit_data.get("รวม", {}).get("note", ""), placeholder="หมายเหตุรวมทั้งหมด...")
                
                st.write("")
                btn_label = "บันทึกการแก้ไข (อัปเดตข้อมูล)" if is_edit_mode else "บันทึกข้อมูลและตรวจสอบ"
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
                        
                        img_url_list = []
                        folder_id = st.secrets.get("drive_folder_id", "")
                        drive_upload_failed = False
                        
                        if final_img_bytes_list:
                            for i, img_bytes in enumerate(final_img_bytes_list):
                                file_name = f"{selected_pea}_{record_date.strftime('%Y%m%d')}_{record_time.strftime('%H%M%S')}_{i+1}.jpg"
                                url = upload_image_to_drive(img_bytes, folder_id, file_name)
                                if url:
                                    img_url_list.append(url)
                                else:
                                    drive_upload_failed = True
                                    
                        # --- [เพิ่มใหม่] หยุดระบบถ้าอัปโหลดรูปไม่เข้า เพื่อให้เห็น Error ชัดๆ ---
                        if drive_upload_failed:
                            st.error("❌ พบปัญหาในการส่งรูปภาพไปที่ Google Drive ข้อมูลยังไม่ถูกบันทึก! โปรดอ่าน Error ด้านบน 👆")
                            st.stop()
                            
                        img_url = ", ".join(img_url_list)
                        
                        # --- [เพิ่มใหม่] ป้องกันรูปเก่าหายเวลากด Edit แล้วไม่ได้อัปรูปใหม่ ---
                        if is_edit_mode and not final_img_bytes_list:
                            img_url = old_img_url
                        
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
                                        data["note"],
                                        img_url,
                                        tap_val,
                                        data.get("cable", ""),
                                        data.get("vt_ab", 0), data.get("vt_bc", 0), data.get("vt_ca", 0),
                                        data.get("vt_an", 0), data.get("vt_bn", 0), data.get("vt_cn", 0),
                                        data.get("ve_ab", 0), data.get("ve_bc", 0), data.get("ve_ca", 0),
                                        data.get("ve_an", 0), data.get("ve_bn", 0), data.get("ve_cn", 0)
                                    ])
                                
                                if total_checked or len(selected_feeders) > 0:
                                    rows_to_insert.append([
                                        record_date.strftime("%d/%m/%Y"),
                                        record_time.strftime("%H:%M:%S"),
                                        selected_pea,
                                        "รวม",
                                        tot_a, tot_b, tot_c, tot_n,
                                        tot_note,
                                        img_url,
                                        tap_val,
                                        "",
                                        0, 0, 0,
                                        0, 0, 0,
                                        0, 0, 0,
                                        0, 0, 0
                                    ])
                                
                                # --- [แก้ไขใหม่] ระบบบันทึกทับตำแหน่งเดิม (In-place Update) ---
                                if is_edit_mode:
                                    records = sheet_record.get_all_records()
                                    rows_to_delete = []
                                    # 1. ค้นหาว่าข้อมูลรอบเดิมอยู่บรรทัดที่เท่าไหร่บ้าง
                                    for idx, row in enumerate(records):
                                        if (str(row.get(col_pea_record, '')).strip() == str(st.session_state.edit_pea).strip() and 
                                            str(row.get('วันที่', '')).strip() == str(st.session_state.edit_date).strip() and 
                                            str(row.get('เวลา', '')).strip() == str(st.session_state.edit_time).strip()):
                                            rows_to_delete.append(idx + 2) # +2 เพราะ index เริ่ม 0 และมี Header
                                            
# --- [แก้ไขใหม่] ลบและแทรกแบบส่งคำสั่งครั้งเดียว ป้องกัน API บล็อก ---
                                    if rows_to_delete:
                                        start_index = min(rows_to_delete)
                                        end_index = max(rows_to_delete)
                                        
                                        # ลบข้อมูลเดิมทิ้งทั้งช่วงฟีดเดอร์ในรอบนั้นทีเดียว (ยิง API รอบเดียว)
                                        sheet_record.delete_rows(start_index, end_index)
                                        
                                        # แทรกข้อมูลใหม่เข้าไปที่ตำแหน่งเดิมเป๊ะๆ
                                        sheet_record.insert_rows(rows_to_insert, row=start_index)
                                    else:
                                        # ถ้าหาประวัติเดิมไม่เจอจริงๆ ให้ต่อท้าย
                                        sheet_record.append_rows(rows_to_insert)
                                else:
                                    # โหมดบันทึกปกติ (รายการใหม่) ให้ต่อท้ายบรรทัดล่างสุด
                                    sheet_record.append_rows(rows_to_insert)
                                # -------------------------------------------------------------
                                
                                success = True
                                break 
                                
                            except gspread.exceptions.WorksheetNotFound:
                                sh = client.open(SHEET_NAME)
                                sheet_record = sh.add_worksheet(title="Record Data", rows=1000, cols=24)
                                # สร้าง Header เริ่มต้น 24 คอลัมน์
                                header_24 = [
                                    "วันที่", "เวลา", "PEA NO", "แท็ป", "ฟีดเดอร์", "ขนาดสาย_ตรมม",
                                    "กระแส A", "กระแส B", "กระแส C", "กระแส N",
                                    "Vปลายสาย_ab", "Vปลายสาย_bc", "Vปลายสาย_ca",
                                    "Vปลายสาย_an", "Vปลายสาย_bn", "Vปลายสาย_cn",
                                    "Vใต้หม้อแปลง_ab", "Vใต้หม้อแปลง_bc", "Vใต้หม้อแปลง_ca",
                                    "Vใต้หม้อแปลง_an", "Vใต้หม้อแปลง_bn", "Vใต้หม้อแปลง_cn",
                                    "หมายเหตุ", "รูปถ่าย"
                                ]
                                sheet_record.append_row(header_24)
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
                                    now_str = datetime.datetime.now(pytz.timezone('Asia/Bangkok')).strftime('%d/%m/%Y %H:%M:%S')
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
