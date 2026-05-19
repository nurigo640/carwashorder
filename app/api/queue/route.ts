import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: entry } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('session_token', token)
    .single()

  if (!entry) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Запись не найдена' },
      { status: 404 }
    )
  }

  const { data: settings } = await supabase
    .from('wash_settings')
    .select('avg_wash_time, active_posts')
    .single()

  return NextResponse.json({ data: entry, settings })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: entry } = await supabase
    .from('queue_entries')
    .select('id, status, position')
    .eq('session_token', token)
    .single()

  if (!entry) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Запись не найдена' },
      { status: 404 }
    )
  }

  if (!['waiting', 'notified', 'entering'].includes(entry.status)) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Нельзя отменить запись с текущим статусом' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('queue_entries')
    .update({ status: 'cancelled', removal_reason: 'client_cancel' })
    .eq('id', entry.id)

  if (error) {
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Не удалось отменить. Попробуйте ещё раз.' },
      { status: 500 }
    )
  }

  await supabase.rpc('reorder_queue')

  return NextResponse.json({ data: { success: true } })
}
