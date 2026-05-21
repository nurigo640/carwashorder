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

  // Получить владельца
  const { data: owner, error: ownerError } = await supabase
    .from('owners')
    .select('id, name, login, password_hash')
    .eq('login', login)
    .single()

  if (ownerError || !owner) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  // Проверить пароль через SQL напрямую
  const { data: pwCheck, error: pwError } = await supabase
    .rpc('check_owner_password', { p_login: login, p_password: password })

  if (pwError) {
    return NextResponse.json({ error: `RPC error: ${pwError.message}` }, { status: 500 })
  }

  if (!pwCheck) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  // Получить мойку
  const { data: settings, error: settingsError } = await supabase
    .from('wash_settings')
    .select('id, name, slug')
    .eq('owner_id', owner.id)
    .single()

  if (settingsError || !settings) {
    return NextResponse.json({ 
      error: `Мойка не найдена: ${settingsError?.message}` 
    }, { status: 404 })
  }

  // JWT
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
