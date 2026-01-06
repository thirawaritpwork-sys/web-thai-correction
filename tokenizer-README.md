# Thai Tokenizer API Server

API สำหรับตัดคำภาษาไทยโดยใช้ PyThaiNLP

## การติดตั้ง

```bash
# ติดตั้ง dependencies
pip3 install -r requirements-tokenizer.txt

# รัน server
python3 tokenizer-server.py
```

Server จะทำงานที่ `http://localhost:5001`

## API Endpoints

### 1. POST `/api/tokenize`
ตัดคำภาษาไทย

**Request:**
```json
{
  "text": "สวัสดีครับผมชื่อสมชาย"
}
```

**Response:**
```json
{
  "original": "สวัสดีครับผมชื่อสมชาย",
  "tokens": ["สวัสดี", "ครับ", "ผม", "ชื่อ", "สมชาย"],
  "token_count": 5
}
```

### 2. GET `/api/corpus`
ดูคลังข้อมูลการแก้ไขปัจจุบัน

**Response:**
```json
{
  "exportDate": "2025-01-06T12:00:00.000Z",
  "version": "1.0",
  "corrections": [
    ["การจนบุรี", "กาญจนบุรี"],
    ["กานจนบุรี", "กาญจนบุรี"]
  ]
}
```

## การทดสอบ

```bash
# รัน tokenizer server ก่อน
python3 tokenizer-server.py

# ทดสอบ API ในเทอร์มินัลอื่น
python3 test-tokenizer.py
```

## การใช้งานร่วมกับ Corpus Server

- **Corpus Server** (port 5000): จัดการ UI และ corpus หลัก
- **Tokenizer Server** (port 5001): ตัดคำภาษาไทยเท่านั้น

## วัตถุประสงค์

- **ตัดคำที่แม่นยำ**: ใช้ PyThaiNLP แทนการตัดคำแบบ space-based
- **เครื่องมือเสริม**: ช่วยดูผลการตัดคำของข้อความที่กำลังแก้ไข
- **ไม่แทรกแซงการทำงาน**: ไม่มีการแก้ไขหรือเรียนรู้อัตโนมัติ