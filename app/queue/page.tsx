'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatWaitTime, calcWaitMinutes } from '@/lib/queue'
import type { QueueEntry, WashSettings } from '@/types'
import { Users, Clock, RefreshCw } from 'lucide-react'

interface QueueData {
  entries: QueueEntry[]
  settings: WashSettings | null
}

export default function QueuePage() {
  const router = useRouter()
  const [data, setData] = useState<QueueData>({ entries: [], settings: null })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isOnline, setIsOnline] = useState(true)

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue')
      if (!res.ok) throw new Error('fetch failed')
      const json = await res.json()
      setData({ entries: json.entries || [], settings: json.settings })
      setLastUpdated(new Date())
      setIsOnline(true)
    } catch {
      setIsOnline(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Проверить есть ли сохранённый токен
    const token = localStorage.getItem('queue_session_token')
    if (token) {
      router.push(`/queue/my/${token}`)
      return
    }
    fetchQueue()
  }, [fetchQueue, router])

  // Realtime подписка
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('queue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, fetchQueue)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchQueue])

  const { entries, settings } = data
  const activeEntries = entries.filter(e =>
    ['waiting', 'notified', 'entering', 'washing'].includes(e.status)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (settings && !settings.is_open) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="text-6xl mb-4">🚗</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Мойка закрыта</h1>
        <p className="text-gray-500">Приходите позже</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <p className="text-xs text-gray-400 text-center">{settings?.name}</p>
        <h1 className="text-xl font-bold text-gray-900 text-center mt-0.5">
          Очередь на мойку
        </h1>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-400">
            {isOnline
              ? `Обновлено в ${lastUpdated.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`
              : 'Нет соединения — данные могут быть устаревшими'}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-32">
        {/* Summary */}
        {activeEntries.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">В очереди</p>
                <p className="text-lg font-bold text-gray-900">{activeEntries.length}</p>
              </div>
            </div>
            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-xs text-gray-500">Ваше ожидание</p>
                <p className="text-lg font-bold text-gray-900">
                  {settings
                    ? formatWaitTime(calcWaitMinutes(activeEntries.length + 1, settings))
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Queue cards */}
        {activeEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Очередь пуста</h2>
            <p className="text-gray-500 text-sm">Вы можете заехать прямо сейчас!</p>
          </div>
        ) : (
          activeEntries.map((entry) => (
            <QueueCard key={entry.id} entry={entry} settings={settings} />
          ))
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-8 px-4">
        <button
          onClick={() => router.push('/queue/join')}
          className="w-full bg-blue-600 text-white font-bold text-base rounded-xl py-4 shadow-lg shadow-blue-200 active:bg-blue-700 transition-colors"
        >
          Встать в очередь →
        </button>
      </div>
    </main>
  )
}

function QueueCard({ entry, settings }: { entry: QueueEntry; settings: WashSettings | null }) {
  const isWashing = entry.status === 'washing'
  const waitText = settings
    ? formatWaitTime(calcWaitMinutes(entry.position, settings))
    : ''

  return (
    <div className={`bg-white rounded-xl border p-4 flex items-center gap-3
      ${isWashing ? 'border-l-4 border-l-blue-500 border-t-gray-200 border-r-gray-200 border-b-gray-200' : 'border-gray-200'}`}>
      {/* Position circle */}
      <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
        <span className="text-xl font-bold text-blue-600">{entry.position}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 tracking-wide">{entry.plate_masked}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {isWashing ? 'Моется сейчас' : waitText}
        </p>
      </div>

      {/* Status badge */}
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0
        ${isWashing
          ? 'bg-green-50 text-green-700'
          : 'bg-blue-50 text-blue-700'}`}>
        {isWashing ? 'Моется' : 'Ожидает'}
      </span>
    </div>
  )
}
