import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-32-chars-minimum!!'
)

export async function POST(req: NextRequest) {
  const { login, password } = await req.json()

  if (!login || !password) {
    return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: owners, error } = await supabase
    .rpc('get_owner_by_credentials', { p_login: login, p_password: password })

  if (error || !owners || owners.length === 0) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  const owner = owners[0]

  const { data: settings } = await supabase
    .from('wash_settings')
    .select('id, name, slug')
    .eq('owner_id', owner.id)
    .single()

  if (!settings) {
    return NextResponse.json({ error: 'Мойка не найдена' }, { status: 404 })
  }

  const token = await new SignJWT({
    owner_id: owner.id,
    wash_id: settings.id,
    name: owner.name,
    wash_name: settings.name,
    wash_slug: settings.slug,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(JWT_SECRET)

  return NextResponse.json({
    token,
    owner: { id: owner.id, name: owner.name },
    wash: { id: settings.id, name: settings.name, slug: settings.slug },
  })
}
