// PromptPay QR code generation using EMV format
// Based on PromptPay standard (Bank of Thailand)

function pad(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) : str.padStart(len, '0')
}

function formatTag(tag: string, value: string): string {
  return `${tag}${pad(String(value.length), 2)}${value}`
}

function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function formatPromptPayId(id: string): string {
  const cleaned = id.replace(/[-\s]/g, '')
  if (/^\d{10}$/.test(cleaned)) {
    // Mobile phone: 0066XXXXXXXXX
    return `0066${cleaned.slice(1)}`
  }
  if (/^\d{13}$/.test(cleaned)) {
    // National ID / tax ID
    return cleaned
  }
  return cleaned
}

export function generatePromptPayQR(promptPayId: string, amount?: number): string {
  const id = formatPromptPayId(promptPayId)

  // Determine type tag
  const idType = /^0066/.test(id) ? '01' : '02'
  const merchantInfo = formatTag('00', 'A000000677010111') + formatTag(idType, id)
  const qrPayload = formatTag('29', merchantInfo)

  let payload =
    formatTag('00', '01') +      // Payload format indicator
    formatTag('01', '12') +      // Point of initiation (12 = dynamic, 11 = static)
    qrPayload +
    formatTag('53', '764') +     // Transaction currency (764 = THB)
    (amount !== undefined
      ? formatTag('54', amount.toFixed(2))  // Transaction amount
      : '') +
    formatTag('58', 'TH') +      // Country code
    '6304'                        // CRC placeholder

  return payload + crc16(payload)
}

export function getPromptPayNumber(): string {
  return (process.env.PROMPTPAY_NUMBER || '').replace(/^﻿/, '')
}
