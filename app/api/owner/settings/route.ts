import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-32-chars-minimum!!')

async function getOwnerFromToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET)
    return payload as { owner_id: string; wash_id: string; wash_name: string }
  } catch { return null }
}

// GET /api/owner/settings — получить настройки мойки
export async function GET(req: NextRequest) {
  const owner = await getOwnerFromToken(req)
  if (!owner) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('wash_settings')
    .select('*')
    .eq('id', owner.wash_id)
    .single()

  return NextResponse.json({ data })
}

// PUT /api/owner/settings — обновить настройки
export async function PUT(req: NextRequest) {
  const owner = await getOwnerFromToken(req)
  if (!owner) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

  const body = await req.json()
  const allowed = ['name', 'is_open', 'active_posts', 'avg_wash_time', 'entry_timeout', 'max_queue_size', 'finish_mode']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('wash_settings')
    .update(updates)
    .eq('id', owner.wash_id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data?.[0] })
}
