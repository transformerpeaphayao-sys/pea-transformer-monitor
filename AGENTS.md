# AGENTS.md — PEA Transformer Load Monitor

Read [`GLOSSARY.md`](./GLOSSARY.md) for domain terms and engineering thresholds before modifying code.

## Core Rule: Surgical Edits Only

1. **Preserve 100% of existing Web App code, UI layout, and features.** Modify only the exact lines required for the requested fix or feature.
2. Verify syntax with `python -m py_compile core.py app_backoffice.py app_field.py` after every edit.

## Architecture & Seams

- [`core.py`](./core.py): Deep module owning Google Sheets/Drive I/O, image compression, authentication, engineering formulas, and Gemini AI analysis.
- [`app_backoffice.py`](./app_backoffice.py): Admin dashboard, filter analytics, transformer profile/history, edit/delete dialogs, and AI report UI.
- [`app_field.py`](./app_field.py): Field technician mobile/tablet UI with Folium map (`Red` = uninspected, `Orange` = pending task) and load recording form.

## Canonical Secrets (`st.secrets`)

Always use these exact secret keys across all files:
- `gcp_service_account`: Google Cloud Service Account credentials dictionary.
- `drive_folder_id`: Target Google Drive Folder ID for transformer photos (fallback: `"16V2W7GAIXSCXlQRIBtKhIoc3K1vVirQC"`).
- `gas_web_app_url`: Google Apps Script Web App URL for image upload/fetch/delete.
- `gemini_api_key` (or `GOOGLE_API_KEY`): Google Gemini API key for load analysis.

## Google Sheets Schema (`PEA_Transformer_DB`)

- **`MasterData`**: `PEANO หม้อแปลง`, `ระบบ`, `ค่าพิกัด kVA หม้อแปลง`, `ยี่ห้อของหม้อแปลง`, `สถานที่`, `LATITUDE`, `LONGITUDE`
- **`Record Data`**: 24-column schema (`วันที่`, `เวลา`, `PEA NO`, `แท็ป`, `ฟีดเดอร์`, `ขนาดสาย_ตรมม`, `กระแส A`, `กระแส B`, `กระแส C`, `กระแส N`, voltages, `หมายเหตุ`, `รูปถ่าย`). Always resolve Feeder column with `"ฟีดเดอร์"` first, then fallback to `"ฟิดเดอร์"` and `"Feeder"`.
- **`Task Data`**: `PEA NO`, `สถานที่`, `วันที่สั่งงาน`, `สถานะ` (`Pending` / `Done`), `ผู้สั่งงาน`
- **`Users`**: `Username`, `Password` (bcrypt hash), `Name`, `EmpID`
- **`AI Reports`**: `Timestamp`, `PEA NO`, `AI Report`

## Engineering Invariants

- Guard all divisions (`avg_i > 0`, `t_kva > 0`, `i_max > 0`).
- Clamp vector neutral radicands with `max(0, ...)` before `math.sqrt()`.
- Extract Google Drive file IDs with `re.search(r'(?:/d/|id=)([-\w]{25,})', url)`.
- Perform multi-image Drive operations via `concurrent.futures.ThreadPoolExecutor(max_workers=10)`.
- Clear Streamlit caches (`load_master_data.clear()`, `load_completed_data.clear()`, `load_task_data.clear()`) after any sheet mutation.
