import re

with open('app_backoffice.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace everything up to the sidebar
sidebar_start_idx = content.find("with st.sidebar:")
header_code = """import streamlit as st
import streamlit.components.v1 as components
from core import *
import os

st.set_page_config(page_title='ระบบบันทึกและตรวจสอบโหลดหม้อแปลง PEA (Back Office)', page_icon='💻', layout='wide', initial_sidebar_state='expanded')
load_custom_css()

if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'page' not in st.session_state:
    st.session_state.page = 'Login'

# --- Scroll to top on page change ---
if "last_page" not in st.session_state:
    st.session_state.last_page = st.session_state.page

if st.session_state.last_page != st.session_state.page:
    st.session_state.last_page = st.session_state.page
    components.html(f\"\"\"
        <script>
            window.parent.scrollTo(0, 0);
            window.parent.document.documentElement.scrollTop = 0;
            const main = window.parent.document.querySelector('.main');
            if (main) {{ main.scrollTo(0, 0); }}
            const block = window.parent.document.querySelector('.block-container');
            if (block) {{ block.scrollIntoView(); }}
        </script>
    \"\"\", height=0)

"""

content = header_code + content[sidebar_start_idx:]

# 2. Replace the sidebar logic
sidebar_end_idx = content.find("# --- 5. Header Banner ---")
new_sidebar = """with st.sidebar:
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
            <div style="font-size:2rem;">⚡</div>
            <div style="font-size:1rem; font-weight:700; color:#e94560; letter-spacing:1px;">PEA LOAD</div>
            <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); margin-top:1px;">Back Office</div>
        </div>
        ''', unsafe_allow_html=True)
    st.markdown("---")
    
    if st.session_state.logged_in:
        st.markdown(f"**👤 ยินดีต้อนรับ:**<br>{st.session_state.user_name}", unsafe_allow_html=True)
        st.markdown("---")
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
            
        st.markdown("<div style='margin-top:10px;'></div>", unsafe_allow_html=True)
        if st.button("🔒 ออกจากระบบ (Logout)", use_container_width=True, type="primary"):
            st.session_state.logged_in = False
            st.session_state.page = "Login"
            st.rerun()
    else:
        if st.button("🔑 เข้าสู่ระบบ", use_container_width=True):
            st.session_state.page = "Login"
            st.rerun()
            
    st.markdown("---")
    if st.button("🔄 ดึงข้อมูลล่าสุด", use_container_width=True, type="secondary"):
        st.cache_data.clear()
        st.rerun()

"""
content = content[:content.find("with st.sidebar:")] + new_sidebar + content[sidebar_end_idx:]

# 3. Find where "elif st.session_state.page == 'Summary':" starts and replace everything from "if st.session_state.page == 'Map':" up to it.
map_page_idx = content.find('            if st.session_state.page == "Map":')
summary_page_idx = content.find('            elif st.session_state.page == "Summary":')

login_logic = """
            if st.session_state.page == "Login":
                st.markdown("#### 🔐 เข้าสู่ระบบ (Back Office)")
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
                                st.success("เข้าสู่ระบบสำเร็จ!")
                                st.rerun()
                            else:
                                st.error("❌ ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง")
                        else:
                            st.warning("กรุณากรอกข้อมูลให้ครบถ้วน")
                
                st.markdown("---")
                if st.button("📝 ลงทะเบียนผู้ใช้งานใหม่"):
                    st.session_state.page = "RegisterUser"
                    st.rerun()
                    
            elif st.session_state.page == "RegisterUser":
                st.markdown("#### 📝 ลงทะเบียนผู้ใช้งานใหม่")
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
                    
"""

content = content[:map_page_idx] + login_logic + content[summary_page_idx:]

with open('app_backoffice.py', 'w', encoding='utf-8') as f:
    f.write(content)
