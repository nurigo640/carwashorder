import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-32-chars-minimum!!')

async function getOwnerFromToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET)
    return payload as { owner_id: string; wash_id: string; wash_slug: string; wash_name: string }
  } catch { return null }
}

// GET /api/owner/qr?format=svg|png|pdf
export async function GET(req: NextRequest) {
  const owner = await getOwnerFromToken(req)
  if (!owner) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'svg'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'

  // URL очереди для этой мойки
  const queueUrl = `${appUrl}/queue?wash=${owner.wash_slug}`

  // Получить настройки для имени и лого
  const supabase = createServiceClient()
  const { data: settings } = await supabase
    .from('wash_settings')
    .select('name, logo_url, qr_color')
    .eq('id', owner.wash_id)
    .single()

  const washName = settings?.name || owner.wash_name || 'АвтоМойка'
  const qrColor = settings?.qr_color || '#000000'

  // Генерируем SVG QR через API qrcode.js (через URL)
  // Возвращаем данные для фронта чтобы сгенерировать QR на клиенте
  return NextResponse.json({
    queue_url: queueUrl,
    wash_name: washName,
    qr_color: qrColor,
    logo_url: settings?.logo_url || null,
    format,
  })
}

// POST /api/owner/qr — сохранить настройки QR (цвет, лого)
export async function POST(req: NextRequest) {
  const owner = await getOwnerFromToken(req)
  if (!owner) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const { qr_color, logo_url, name } = await req.json()
  const updates: Record<string, any> = {}
  if (qr_color) updates.qr_color = qr_color
  if (logo_url !== undefined) updates.logo_url = logo_url
  if (name) updates.name = name

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('wash_settings')
    .update(updates)
    .eq('id', owner.wash_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
