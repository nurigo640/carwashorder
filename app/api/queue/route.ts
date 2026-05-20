import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { maskPlate, normalizePlate, validatePlate, calcWaitMinutes } from '@/lib/queue'
import type { JoinQueueRequest, ApiResponse, JoinQueueResponse } from '@/types'

// GET /api/queue — получить список очереди и настройки
export async function GET() {
  const supabase = createServiceClient()

  const [{ data: entries }, { data: settings }, { data: posts }] = await Promise.all([
    supabase
      .from('queue_entries')
      .select('id, plate_masked, position, status, created_at, post_number, wash_started_at')
      .in('status', ['waiting', 'notified', 'entering', 'washing'])
      .order('position', { ascending: true }),
    supabase
      .from('wash_settings')
      .select('*')
      .single(),
    supabase
      .from('wash_posts')
      .select('post_number, is_active, current_entry_id, timer_ends_at')
      .order('post_number'),
  ])

  return NextResponse.json({ entries: entries || [], settings, posts: posts || [] })
}

// POST /api/queue — встать в очередь
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body: JoinQueueRequest = await req.json()

  // Валидация номера
if (!body.plate_number || body.plate_number.length < 2) {
  return NextResponse.json<ApiResponse<never>>(
    { error: 'Введите номер автомобиля' },
    { status: 400 }
  )
}

const plate = body.plate_number.trim().toUpperCase()

  // Получить настройки
  const { data: settings } = await supabase
    .from('wash_settings')
    .select('*')
    .single()

  if (!settings?.is_open) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Мойка сейчас закрыта' },
      { status: 403 }
    )
  }

  // Проверить лимит очереди
  const { count } = await supabase
    .from('queue_entries')
    .select('*', { count: 'exact', head: true })
    .in('status', ['waiting', 'notified', 'entering'])

  if ((count || 0) >= settings.max_queue_size) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Очередь заполнена. Попробуйте позже.' },
      { status: 429 }
    )
  }

  // Проверить дубликат
  const { data: existing } = await supabase
    .from('queue_entries')
    .select('session_token, position')
    .eq('plate_number', plate)
    .in('status', ['waiting', 'notified', 'entering', 'washing'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Этот номер уже в очереди', data: { session_token: existing.session_token } as any },
      { status: 409 }
    )
  }

  // Получить следующую позицию
  const { data: posData } = await supabase.rpc('next_queue_position')
  const position = posData || 1

  const masked = maskPlate(plate)
  const sessionToken = crypto.randomUUID()

  const { data: entry, error } = await supabase
    .from('queue_entries')
    .insert({
      plate_number: plate,
      plate_masked: masked,
      position,
      session_token: sessionToken,
      status: 'waiting',
      source: 'client',
    })
    .select()
    .single()

  if (error || !entry) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Не удалось добавить в очередь. Попробуйте ещё раз.' },
      { status: 500 }
    )
  }

  const estimatedWait = calcWaitMinutes(position, settings)

  return NextResponse.json<ApiResponse<JoinQueueResponse>>({
    data: {
      entry,
      session_token: sessionToken,
      estimated_wait_minutes: estimatedWait,
    }
  }, { status: 201 })
}
