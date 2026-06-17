# Ticket Sales — ระบบขายบัตรออนไลน์

ระบบขายบัตรงานอีเว้นต์ครบวงจร รองรับการซื้อบัตรผ่าน LINE LIFF, เลือกที่นั่งแบบ Seat Map, อัปโหลดสลิป, ส่งบัตรอัตโนมัติ และระบบ Check-in ด้วย QR Code

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | Tailwind CSS, Lucide Icons |
| Database | Google Sheets (Sheets API v4) |
| Auth (User) | LINE LIFF v2 |
| Auth (Admin) | JWT + bcrypt |
| File Storage | Cloudinary (รูปภาพ), Google Drive (สลิป) |
| Ticket Image | satori → sharp (PNG, รองรับ Thai font) |
| Notification | LINE Messaging API, Nodemailer (Email) |
| OCR | Google Vision API (ตรวจสลิป) |
| QR Scan | jsQR |
| Deploy | Vercel |

---

## Features

### ฝั่งผู้ใช้ (LINE LIFF)

- **หน้าแรก** — แสดงรายการงานที่เปิดรับสมัคร
- **ลงทะเบียน** — 3 ขั้นตอน: เลือกบัตร → กรอกข้อมูล → ยืนยัน
  - โหมด `ticket_type` — เลือกประเภทบัตร (VIP, ทั่วไป ฯลฯ)
  - โหมด `seat_map` — เลือกที่นั่งบนผัง จัดแถว A→B→C ตามจริง
- **ชำระเงิน** — แสดง QR PromptPay, อัปโหลดสลิป
- **บัตรของฉัน** — ดูสถานะบัตร, บัตร PNG พร้อม QR Code

### แผงผู้ดูแล (Admin Panel)

| หน้า | ความสามารถ |
|---|---|
| Dashboard | สถิติ: ลงทะเบียน, ชำระแล้ว, รายได้, Check-in |
| จัดการงาน | สร้าง/แก้ไข Event, อัปโหลด Banner, QR PromptPay |
| ผังที่นั่ง | วาดผัง Grid แบบ Visual, วางโซน, วาดทางเดิน (Aisle) |
| ประเภทบัตร | จัดการ Ticket Type, ราคา, โควต้า |
| การลงทะเบียน | ดูรายการทั้งหมด, ค้นหา, ส่งบัตรซ้ำ |
| การชำระเงิน | ดูสลิป, ผล OCR, อนุมัติ/ปฏิเสธ |
| Check-in | สแกน QR, ค้นหาด้วยเบอร์โทร/ชื่อ |
| Staff | เพิ่ม/จัดการทีมงาน (super_admin, admin, staff) |
| ตั้งค่า | ข้อมูลองค์กร, ตั้งค่าระบบ |

---

## โครงสร้างโปรเจค

```
src/
├── app/
│   ├── page.tsx                    # หน้าแรก (LIFF)
│   ├── event/[id]/                 # รายละเอียดงาน
│   ├── register/[id]/              # ลงทะเบียน (3 steps)
│   ├── payment/[reg_id]/           # ชำระเงิน + อัปโหลดสลิป
│   ├── my-tickets/                 # บัตรของฉัน
│   ├── checkin/                    # Self check-in (user)
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── events/
│   │   │   └── [id]/seat-map/      # Visual Seat Map Editor
│   │   ├── tickets/
│   │   ├── registrations/
│   │   ├── payments/
│   │   ├── checkin/                # Admin Check-in (QR + ค้นหา)
│   │   ├── staffs/
│   │   └── settings/
│   └── api/
│       ├── admin/                  # Admin APIs (JWT protected)
│       │   ├── events/
│       │   ├── seats/[event_id]/
│       │   ├── tickets/
│       │   ├── payments/
│       │   ├── registrations/
│       │   ├── staffs/
│       │   ├── upload/
│       │   └── login/
│       ├── checkin/                # Check-in API
│       ├── register/               # สร้างการลงทะเบียน
│       └── payment/
│           ├── qr/                 # สร้าง QR PromptPay
│           └── upload-slip/        # อัปโหลดสลิป + OCR
├── lib/
│   ├── sheets.ts                   # Google Sheets CRUD ทั้งหมด
│   ├── auth.ts                     # JWT middleware
│   ├── ticket.ts                   # สร้างบัตร PNG (satori)
│   ├── line.ts                     # LINE Messaging API
│   ├── email.ts                    # ส่งอีเมล (nodemailer)
│   ├── cloudinary.ts               # อัปโหลดรูปภาพ
│   ├── drive.ts                    # Google Drive (สลิป)
│   ├── ocr.ts                      # Google Vision OCR
│   └── promptpay.ts                # สร้าง QR PromptPay
├── components/
│   ├── admin/AdminLayout.tsx
│   ├── liff/LiffProvider.tsx
│   └── ui/                         # Toast, Modal, LoadingSpinner ฯลฯ
└── types/index.ts                  # TypeScript types ทั้งหมด
```

---

## Google Sheets Schema

ระบบใช้ Google Sheets เป็นฐานข้อมูล มี 9 Sheet:

| Sheet | ข้อมูล |
|---|---|
| `events` | งาน/อีเว้นต์ |
| `ticket_types` | ประเภทบัตร |
| `seats` | ที่นั่ง (seat_map mode) |
| `registrations` | การลงทะเบียน |
| `payments` | การชำระเงิน + ผล OCR |
| `checkins` | บันทึก Check-in |
| `staffs` | ทีมงาน/ผู้ดูแล |
| `settings` | ตั้งค่าระบบ |
| `audit_logs` | บันทึกการกระทำ |

---

## Environment Variables

สร้างไฟล์ `.env.local` จาก `.env.example`:

```env
# Google Sheets / Service Account
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_BASE64=      # base64 ของ service-account.json

# LINE LIFF
NEXT_PUBLIC_LIFF_ID=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

# JWT
JWT_SECRET=

# Admin
SUPER_ADMIN_TOKEN=                  # token สำหรับ super admin

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google Drive
GOOGLE_DRIVE_FOLDER_ID=

# Email (SMTP)
EMAIL_USER=
EMAIL_PASS=

# PromptPay
PROMPTPAY_NUMBER=                   # เบอร์โทร หรือ เลขประจำตัวผู้เสียภาษี
```

---

## การติดตั้ง

```bash
# 1. Clone repo
git clone <repo-url>
cd ticket-sales

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env.local และกรอกค่า

# 4. รัน development server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

---

## การตั้งค่า Google Sheets

1. สร้าง Google Spreadsheet ใหม่
2. เปิดใช้งาน Google Sheets API และ Google Drive API ใน Google Cloud Console
3. สร้าง Service Account → ดาวน์โหลด JSON key
4. แปลง JSON เป็น base64: `base64 -i service-account.json`
5. แชร์ Spreadsheet ให้ Service Account email (Editor)
6. เรียก `GET /api/init` เพื่อสร้าง sheet headers อัตโนมัติ

---

## การตั้งค่า LINE LIFF

1. สร้าง LINE Official Account และ Messaging API Channel
2. สร้าง LIFF App ใน LINE Developers Console
   - Size: Full
   - Endpoint URL: `https://your-domain.com`
3. คัดลอก LIFF ID → ใส่ใน `NEXT_PUBLIC_LIFF_ID`

---

## Seat Map Editor

สำหรับงานที่ใช้โหมด `seat_map`:

1. ไปที่ Admin → จัดการงาน → ผังที่นั่ง
2. กำหนดขนาดตาราง (แถว × คอลัมน์)
3. สร้างโซน (ชื่อ, สี, ราคา)
4. คลิกเซลล์เพื่อวางที่นั่ง หรือเลือกเครื่องมือ **ทางเดิน** เพื่อวาง Aisle
5. กด **บันทึกผัง** → ระบบสร้าง seat records ใน Google Sheets

ที่นั่งจะแสดงผลฝั่ง user จัดเป็นแถว A, B, C... ตามลำดับ

---

## Check-in

Admin สามารถ check-in ผู้เข้างานได้ 3 วิธี:

| วิธี | รายละเอียด |
|---|---|
| สแกน QR | ใช้กล้องโทรศัพท์สแกน QR บนบัตร |
| รหัสลงทะเบียน | พิมพ์ reg_id หรือสแกนจากอุปกรณ์ภายนอก |
| เบอร์โทร | ค้นหาจาก customer_phone |
| ชื่อ | ค้นหาจากชื่อหรือชื่อเล่น |

---

## Ticket Generation

บัตรสร้างเป็น PNG ขนาด 800×420px ด้วย **satori** (แปลงข้อความเป็น SVG paths) เพื่อรองรับภาษาไทยโดยไม่ต้องติดตั้ง font บน server

Font ที่ใช้: `Kanit` (Regular + Bold) เก็บใน `public/fonts/`

---

## Deploy บน Vercel

```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

กำหนด Environment Variables ทั้งหมดใน Vercel Dashboard → Settings → Environment Variables

> **หมายเหตุ:** ตั้งค่าตัวแปรผ่าน Vercel Dashboard โดยตรง (ไม่ผ่าน CLI pipe) เพื่อหลีกเลี่ยงปัญหา UTF-8 BOM

---

## สิทธิ์การเข้าถึง Admin

| Role | สิทธิ์ |
|---|---|
| `super_admin` | เข้าถึงทุกส่วน รวมถึงจัดการ Staff |
| `admin` | จัดการ Event, Payment, Registration, Seat Map |
| `staff` | Check-in และดูข้อมูลเท่านั้น |

URL Admin: `/admin`
