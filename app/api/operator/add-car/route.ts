import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { maskPlate, normalizePlate, validatePlate } from '@/lib/queue'
import type { ApiResponse } from '@/types'

// POST /api/operator/add-car
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { plate_number, note, shift_id } = await req.json()

  if (!plate_number || !validatePlate(plate_number)) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Неверный формат номера' },
      { status: 400 }
    )
  }

  const plate = normalizePlate(plate_number)

  // Проверить настройки
  const { data: settings } = await supabase
    .from('wash_settings')
    .select('max_queue_size')
    .single()

  // Проверить лимит
  const { count } = await supabase
    .from('queue_entries')
    .select('*', { count: 'exact', head: true })
    .in('status', ['waiting', 'notified', 'entering'])

  if ((count || 0) >= (settings?.max_queue_size || 20)) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Очередь заполнена' },
      { status: 429 }
    )
  }

  // Проверить дубликат
  const { data: existing } = await supabase
    .from('queue_entries')
    .select('id, position')
    .eq('plate_number', plate)
    .in('status', ['waiting', 'notified', 'entering', 'washing'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Этот номер уже в очереди' },
      { status: 409 }
    )
  }

  // Получить следующую позицию
  const { data: posData } = await supabase.rpc('next_queue_position')
  const position = posData || 1

  const { data: entry, error } = await supabase
    .from('queue_entries')
    .insert({
      plate_number: plate,
      plate_masked: maskPlate(plate),
      position,
      session_token: crypto.randomUUID(),
      status: 'waiting',
      source: 'operator',
      operator_note: note || null,
      shift_id: shift_id || null,
    })
    .select()
    .single()

  if (error || !entry) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Не удалось добавить автомобиль' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: entry }, { status: 201 })
}
