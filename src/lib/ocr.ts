import { google } from 'googleapis'

interface OcrResult {
  ocr_amount?: number
  ocr_transfer_date?: string
  ocr_transfer_time?: string
  ocr_sender_name?: string
  ocr_receiver_name?: string
  ocr_bank?: string
  ocr_confidence: number
  ocr_raw_text: string
  ocr_status: 'success' | 'partial' | 'failed'
}

function getAuth() {
  const b64 = (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || '').replace(/^﻿/, '')
  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
  return new google.auth.GoogleAuth({
    credentials: json,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
}

export async function performOcr(imageBuffer: Buffer): Promise<OcrResult> {
  try {
    const auth = getAuth()
    const accessToken = await auth.getAccessToken()

    const base64Image = imageBuffer.toString('base64')

    const response = await fetch(
      'https://vision.googleapis.com/v1/images:annotate',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 1 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            ],
          }],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`)
    }

    const data = await response.json()
    const textAnnotations = data.responses?.[0]?.textAnnotations
    const fullText = textAnnotations?.[0]?.description ?? ''

    if (!fullText) {
      return { ocr_raw_text: '', ocr_confidence: 0, ocr_status: 'failed' }
    }

    return parseSlipText(fullText)
  } catch (err) {
    console.error('OCR error:', err)
    return { ocr_raw_text: '', ocr_confidence: 0, ocr_status: 'failed' }
  }
}

function parseSlipText(text: string): OcrResult {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const result: OcrResult = {
    ocr_raw_text: text,
    ocr_confidence: 0,
    ocr_status: 'partial',
  }

  let fieldsFound = 0

  // ---- Amount ----
  const amountPatterns = [
    /(?:จำนวน|amount|ยอด)[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /(\d{1,3}(?:,\d{3})*\.\d{2})\s*(?:บาท|THB|฿)/i,
    /(?:โอนเงิน|transfer)[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
  ]
  for (const pat of amountPatterns) {
    const m = text.match(pat)
    if (m) {
      result.ocr_amount = parseFloat(m[1].replace(/,/g, ''))
      fieldsFound++
      break
    }
  }

  // ---- Date ----
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{1,2}\s+(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ]
  for (const pat of datePatterns) {
    const m = text.match(pat)
    if (m) {
      result.ocr_transfer_date = m[1]
      fieldsFound++
      break
    }
  }

  // ---- Time ----
  const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|น\.|am|pm))?)/)
  if (timeMatch) {
    result.ocr_transfer_time = timeMatch[1]
    fieldsFound++
  }

  // ---- Bank ----
  const banks = ['กสิกรไทย', 'KBANK', 'SCB', 'ไทยพาณิชย์', 'กรุงเทพ', 'BBL', 'กรุงไทย', 'KTB', 'ทหารไทย', 'TTB', 'กรุงศรี', 'BAY', 'ออมสิน', 'GSB', 'ธนาคาร', 'KASIKORN', 'BANGKOK BANK', 'KRUNGSRI', 'UOB', 'CIMB', 'TMB']
  for (const bank of banks) {
    if (text.toUpperCase().includes(bank.toUpperCase())) {
      result.ocr_bank = bank
      fieldsFound++
      break
    }
  }

  // ---- Sender / Receiver ----
  const senderPatterns = [
    /(?:จาก|from|ผู้โอน)[:\s]+([ก-ๆเ-ไa-zA-Z\s]+?)(?:\n|บัญชี|account)/i,
    /บัญชีต้นทาง[:\s]+([ก-ๆเ-ไa-zA-Z\s]+?)(?:\n)/i,
  ]
  for (const pat of senderPatterns) {
    const m = text.match(pat)
    if (m) {
      result.ocr_sender_name = m[1].trim()
      fieldsFound++
      break
    }
  }

  const receiverPatterns = [
    /(?:ถึง|to|ผู้รับ)[:\s]+([ก-ๆเ-ไa-zA-Z\s]+?)(?:\n|บัญชี|account)/i,
    /บัญชีปลายทาง[:\s]+([ก-ๆเ-ไa-zA-Z\s]+?)(?:\n)/i,
  ]
  for (const pat of receiverPatterns) {
    const m = text.match(pat)
    if (m) {
      result.ocr_receiver_name = m[1].trim()
      fieldsFound++
      break
    }
  }

  // ---- Confidence ----
  const maxFields = 5
  result.ocr_confidence = Math.round((fieldsFound / maxFields) * 100)

  if (fieldsFound === 0) {
    result.ocr_status = 'failed'
  } else if (fieldsFound >= 3) {
    result.ocr_status = 'success'
  } else {
    result.ocr_status = 'partial'
  }

  return result
}
