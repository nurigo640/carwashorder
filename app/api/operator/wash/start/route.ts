import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// POST /api/operator/wash/start — начать мойку
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { entry_id, post_number, shift_id } = await req.json()

  if (!entry_id || !post_number || !shift_id) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Не указан автомобиль, пост или смена' },
      { status: 400 }
    )
  }

  // Получить настройки для расчёта таймера
  const { data: settings } = await supabase
    .from('wash_settings')
    .select('avg_wash_time, finish_mode')
    .single()

  const avgMinutes = settings?.avg_wash_time || 15
  const timerEndsAt = new Date(Date.now() + avgMinutes * 60 * 1000).toISOString()

  // Обновить запись — статус "washing"
  const { error: entryError } = await supabase
    .from('queue_entries')
    .update({
      status: 'washing',
      post_number,
      shift_id,
      wash_started_at: new Date().toISOString(),
    })
    .eq('id', entry_id)
    .in('status', ['waiting', 'notified', 'entering'])

  if (entryError) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Не удалось начать мойку' },
      { status: 500 }
    )
  }

  // Обновить пост
  await supabase
    .from('wash_posts')
    .update({
      current_entry_id: entry_id,
      timer_started_at: new Date().toISOString(),
      timer_ends_at: timerEndsAt,
    })
    .eq('post_number', post_number)

  // Пересчитать очередь
  await supabase.rpc('reorder_queue')

  // Уведомить следующего клиента в очереди
  const { data: nextEntry } = await supabase
    .from('queue_entries')
    .select('id')
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (nextEntry) {
    await supabase
      .from('queue_entries')
      .update({ status: 'notified', notified_at: new Date().toISOString() })
      .eq('id', nextEntry.id)
  }

  return NextResponse.json({ data: { success: true, timer_ends_at: timerEndsAt } })
}
