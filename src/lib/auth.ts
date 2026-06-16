import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthPayload, StaffRole } from '@/types'
import { cookies } from 'next/headers'

const JWT_SECRET = (process.env.JWT_SECRET || 'fallback-secret-change-me').replace(/^﻿/, '')
const COOKIE_NAME = 'ts_admin_token'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

export function getTokenFromCookies(): string | null {
  try {
    const cookieStore = cookies()
    return cookieStore.get(COOKIE_NAME)?.value ?? null
  } catch {
    return null
  }
}

export function getAuthPayload(): AuthPayload | null {
  const token = getTokenFromCookies()
  if (!token) return null
  return verifyToken(token)
}

export function requireRole(requiredRole: StaffRole): (payload: AuthPayload | null) => boolean {
  const roleRank: Record<StaffRole, number> = {
    super_admin: 3,
    admin: 2,
    staff: 1,
  }
  return (payload) => {
    if (!payload) return false
    return (roleRank[payload.role] ?? 0) >= (roleRank[requiredRole] ?? 99)
  }
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME

export function createAuthResponse(payload: AuthPayload): { token: string; maxAge: number } {
  const token = generateToken(payload)
  return { token, maxAge: 60 * 60 * 24 * 7 } // 7 days
}
