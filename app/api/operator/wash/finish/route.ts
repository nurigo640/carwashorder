import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { ApiResponse, FinishBy } from '@/types'

// POST /api/operator/wash/finish
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { entry_id, post_number, finish_by, shift_id } = await req.json()

  if (!entry_id || !post_number) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Не указан автомобиль или пост' },
      { status: 400 }
    )
  }

  // Завершить запись
  const { error } = await supabase
    .from('queue_entries')
    .update({
      status: 'done',
      wash_ended_at: new Date().toISOString(),
      finish_by: finish_by as FinishBy || 'operator',
    })
    .eq('id', entry_id)
    .eq('status', 'washing')

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Не удалось завершить мойку' },
      { status: 500 }
    )
  }

  // Освободить пост
  await supabase
    .from('wash_posts')
    .update({
      current_entry_id: null,
      timer_started_at: null,
      timer_ends_at: null,
    })
    .eq('post_number', post_number)

  // Обновить счётчик смены
  if (shift_id) {
    await supabase.rpc('increment_shift_washed', { shift_id })
  }

  // Уведомить следующего клиента
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

  return NextResponse.json({ data: { success: true } })
}
