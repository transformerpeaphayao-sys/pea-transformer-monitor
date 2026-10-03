# PEA Transformer Load Monitor (Next.js 15 + TypeScript + PWA)

ระบบบันทึกและตรวจสอบโหลดหม้อแปลงไฟฟ้า การไฟฟ้าส่วนภูมิภาค (กฟภ.)
พัฒนาด้วย Next.js 15 App Router, TypeScript, Tailwind CSS, Leaflet, Google Gemini AI และ PWA

## 🌟 จุดเด่นของสถาปัตยกรรมใหม่

1. **ความเร็วสูง (60 FPS):** สถาปัตยกรรม Next.js 15 App Router ตอบสนองไวระดับเสี้ยววินาที ไม่มีหน่วงหรือ Refresh ซ้ำๆ
2. **รองรับ PWA (Mobile-First):** ช่างหน้างานสามารถกด **"Add to Home Screen"** บนมือถือ ติดตั้งเป็นไอคอนแอปได้ทันที
3. **ระบบ Offline-First:** บันทึกข้อมูลเข้าเครื่องได้แม้ไม่มีสัญญาณ 4G/5G และระบบจะ Auto-Sync ขึ้น Google Sheets ให้ทันทีเมื่อต่อเน็ต
4. **แผนที่หม้อแปลงดาวเทียม (Leaflet + Google Hybrid):** ปักหมุดสีแดง (ยังไม่ตรวจ) และหมุดสีส้ม (สั่งตรวจซ้ำ) นำทาง GPS ได้อย่างแม่นยำ
5. **AI Analysis ในตัว:** เชื่อมต่อ Google Gemini 2.5 วิเคราะห์โหลดหม้อแปลงเชิงวิศวกรรมไฟฟ้าพร้อมสรุปคำแนะนำในคลิกเดียว

## 🛠️ คำสั่งสำหรับพัฒนาและทดสอบ (Commands)

```bash
# 1. รันโหมด Development (Port 3000)
npm run dev

# 2. รันชุดทดสอบวิศวกรรมไฟฟ้า TDD (Matt Pocock Philosophy)
npm run test

# 3. Build สำหรับ Production
npm run build

# 4. Start Production Server
npm run start
```

## 📐 สถาปัตยกรรมโฟลเดอร์

- `src/lib/domain/`: Pure Engineering Logic (สูตรคำนวณ %UF, %Unbalance, เวกเตอร์นิวตรอล, ฮาร์มอนิกบิตคอยน์)
- `src/lib/adapters/`: Google Sheets, Google Drive และ Google Gemini AI
- `src/app/page.tsx`: แดชบอร์ดผู้บริหารและสำนักงาน (Backoffice)
- `src/app/field/page.tsx`: แผนที่ดาวเทียมและฟอร์มบันทึกโหลดหน้างาน (Field PWA)
- `public/manifest.json` & `public/sw.js`: PWA Service Worker & Manifest
