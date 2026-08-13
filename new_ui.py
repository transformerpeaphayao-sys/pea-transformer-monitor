                            session_colors = ["#ffffff", "#f8fafc"] # ขาว สลับ เทาอ่อนสุด
                            session_idx = 0
                            prev_session = None
                            
                            # สไตล์ของหัวตารางหลัก (Header)
                            th_style = "background:linear-gradient(135deg, #0f172a, #1e293b); color:#ffffff; padding:12px 10px; text-align:center; font-weight:600; font-size:0.85rem; border:1px solid #334155;"
                            # สไตล์ของเซลล์ข้อมูล (Data Cell)
                            td_style = "padding:10px 8px; text-align:center; border-bottom:1px solid #e2e8f0; border-right:1px solid #f1f5f9; color:#334155; font-size:0.85rem;"
                            
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
                                
                                # Styling เฉพาะคอลัมน์สีตัวเลข
                                style_ll = td_style
                                style_ln = td_style
                                style_i_a = td_style + "color:#dc2626; font-weight:600;" # แดง
                                style_i_b = td_style + "color:#16a34a; font-weight:600;" # เขียว
                                style_i_c = td_style + "color:#2563eb; font-weight:600;" # น้ำเงิน
                                style_i_n = td_style + "color:#475569; font-weight:600;" # เทาเข้ม
                                
                                td_v_t = f"<td style='{style_ll}'>{fmt_v(vab_t, '#0284c7')}</td><td style='{style_ll}'>{fmt_v(vbc_t, '#0284c7')}</td><td style='{style_ll}'>{fmt_v(vca_t, '#0284c7')}</td><td style='{style_ln}'>{fmt_v(van_t, '#64748b', False)}</td><td style='{style_ln}'>{fmt_v(vbn_t, '#64748b', False)}</td><td style='{style_ln}'>{fmt_v(vcn_t, '#64748b', False)}</td>"
                                td_v_e = f"<td style='{style_ll}'>{fmt_v(vab_e, '#0284c7')}</td><td style='{style_ll}'>{fmt_v(vbc_e, '#0284c7')}</td><td style='{style_ll}'>{fmt_v(vca_e, '#0284c7')}</td><td style='{style_ln}'>{fmt_v(van_e, '#64748b', False)}</td><td style='{style_ln}'>{fmt_v(vbn_e, '#64748b', False)}</td><td style='{style_ln}'>{fmt_v(vcn_e, '#64748b', False)}</td>"
                                td_i = f"<td style='{style_i_a}'>{fmt_v(a_val, '#dc2626')}</td><td style='{style_i_b}'>{fmt_v(b_val, '#16a34a')}</td><td style='{style_i_c}'>{fmt_v(c_val, '#2563eb')}</td><td style='{style_i_n}'>{fmt_v(n_val, '#475569')}</td>"
                                # -----------------------------------
                                unb_str = f"<span style='font-weight:600; color:#0f172a;'>{unb:.2f}%</span>"
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
                                
                                tap_td_h = f"<td style='{td_style} font-weight:600;'>{row.get(col_tap_h, '-')}</td>" if col_tap_h else ""
                                
                                if is_total:
                                    # สไตล์สำหรับแถวสรุปผล (Professional Summary Row)
                                    td_total = td_style + "font-weight:700; background-color:#f1f5f9; border-top:2px solid #cbd5e1; border-bottom:2px solid #cbd5e1;"
                                    feeder_display = f"<span style='color:#0f172a; font-weight:700;'>✨ สรุปผลรวมหม้อแปลง รอบที่ {session_idx} ➡️</span>"
                                    
                                    colspan_val = 15 if is_hist_new_format else 14
                                    rows_html += f"<tr style='background:#f1f5f9; transition: all 0.2s;' onmouseover=\"this.style.background='#e2e8f0'\" onmouseout=\"this.style.background='#f1f5f9'\"><td colspan='{colspan_val}' style='{td_total}text-align:right;'>{feeder_display}</td>{td_i}<td style='{td_total}'>{kva_str}</td><td style='{td_total}'>{uf_str}</td><td style='{td_total}'>{unb_str}</td><td style='{td_total}text-align:left;color:#64748b;'>{note_val}</td>{td_img}</tr>"
                                else:
                                    # สไตล์สำหรับแถวธรรมดา พร้อม Hover Effect สวยๆ
                                    rows_html += f"<tr style='background:{bg}; transition: all 0.2s;' onmouseover=\"this.style.background='#f1f5f9'\" onmouseout=\"this.style.background='{bg}'\"><td style='{td_style}'>{row.get(col_date, '-')}</td><td style='{td_style}'>{row.get(col_time, '-')}</td><td style='{td_style} font-weight:600; color:#0f172a;'>{feeder_val}</td>{tap_td_h}{td_v_t}{td_v_e}{td_i}<td style='{td_style}'>{kva_str}</td><td style='{td_style}'>{uf_str}</td><td style='{td_style}'>{unb_str}</td><td style='{td_style}text-align:left;color:#64748b;'>{note_val}</td>{td_img}</tr>"
                            
                            tap_th_h = f"<th rowspan='2' style=\"{th_style}\">🎛️ แท็ป</th>" if is_hist_new_format else ""
                            
                            # สไตล์ Sub-header แบบไร้รอยต่อ (Seamless Borders)
                            bg_sub = "background:#1e293b;" 
                            sub_th_base = f"{bg_sub} padding:8px; font-size:0.75rem; border:1px solid #334155; font-weight:500;"
                            sub_th_style_ll = f"{sub_th_base} color:#38bdf8;"
                            sub_th_style_ln = f"{sub_th_base} color:#94a3b8;"
                            sub_th_style_i_a = f"{sub_th_base} color:#f87171;"
                            sub_th_style_i_b = f"{sub_th_base} color:#4ade80;"
                            sub_th_style_i_c = f"{sub_th_base} color:#60a5fa;"
                            sub_th_style_i_n = f"{sub_th_base} color:#94a3b8;"

                            header_html = (
                                "<thead>"
                                "<tr>"
                                f"<th rowspan='2' style='{th_style}'>📅 วันที่</th>"
                                f"<th rowspan='2' style='{th_style}'>🕐 เวลา</th>"
                                f"<th rowspan='2' style='{th_style}'>🔌 ฟีดเดอร์</th>"
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
                            
                            full_html = f"<div style='border-radius:10px; overflow:hidden; border:1px solid #cbd5e1; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);'><div style='overflow-x:auto;'><table style='width:100%; border-collapse:collapse; min-width:1400px; text-align:center;'>{header_html}<tbody>{rows_html}</tbody></table></div></div>"
                            
                            st.markdown(full_html, unsafe_allow_html=True)
