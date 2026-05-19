'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCountdown, formatWaitTime, calcWaitMinutes, remainingSeconds } from '@/lib/queue'
import type { QueueEntry, WashSettings } from '@/types'
import { Bell, Clock, Car, X, AlertTriangle } from 'lucide-react'

export default function MyQueuePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [entry, setEntry] = useState<QueueEntry | null>(null)
  const [settings, setSettings] = useState<WashSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const fetchEntry = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue/${token}`)
      if (!res.ok) {
        localStorage.removeItem('queue_session_token')
        router.push('/queue')
        return
      }
      const json = await res.json()
      setEntry(json.data)
      setSettings(json.settings)
    } finally {
      setLoading(false)
    }
  }, [token, router])

  useEffect(() => { fetchEntry() }, [fetchEntry])

  // Realtime подписка на изменение своей записи
  useEffect(() => {
    if (!entry?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`entry_${entry.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queue_entries', filter: `id=eq.${entry.id}` },
        (payload) => {
          setEntry(payload.new as QueueEntry)
          // Вибрация при уведомлении
          if (payload.new.status === 'notified' || payload.new.status === 'entering') {
            if ('vibrate' in navigator) navigator.vibrate([300, 100, 300])
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [entry?.id])

  // Таймер обратного отсчёта для статуса entering/notified
  useEffect(() => {
    if (!entry?.notified_at || !settings) return
    if (!['notified', 'entering'].includes(entry.status)) return

    const entryTimeoutMs = (settings.entry_timeout || 2) * 60 * 1000
    const endsAt = new Date(new Date(entry.notified_at).getTime() + entryTimeoutMs).toISOString()

    const tick = () => setCountdown(remainingSeconds(endsAt))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [entry?.notified_at, entry?.status, settings])

  const handleCancel = async () => {
    setCancelLoading(true)
    try {
      const res = await fetch(`/api/queue/${token}`, { method: 'DELETE' })
      if (res.ok) {
        localStorage.removeItem('queue_session_token')
        router.push('/queue')
      }
    } finally {
      setCancelLoading(false)
      setShowCancel(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!entry) return null

  // Статус: таймаут
  if (entry.status === 'timeout') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ваша очередь отменена</h1>
        <p className="text-gray-500 mb-8">
          Вы не успели заехать в течение отведённого времени.
          Место перешло следующему автомобилю.
        </p>
        <button
          onClick={() => { localStorage.removeItem('queue_session_token'); router.push('/queue/join') }}
          className="w-full bg-blue-600 text-white font-bold rounded-xl py-4"
        >
          Встать в очередь заново →
        </button>
      </div>
    )
  }

  // Статус: ваша очередь (entering/notified)
  if (['notified', 'entering'].includes(entry.status)) {
    const isUrgent = countdown <= 30
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-6
        ${isUrgent ? 'bg-red-600' : 'bg-blue-600'} transition-colors duration-500`}>
        <div className="bg-white/15 rounded-full px-4 py-1.5 mb-6">
          <span className="text-white text-xs font-bold tracking-widest uppercase">
            Ваша очередь!
          </span>
        </div>
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          Заезжайте прямо сейчас!
        </h1>

        {/* Countdown ring */}
        <div className="relative w-48 h-48 mb-8">
          <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6"/>
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - countdown / ((settings?.entry_timeout || 2) * 60))}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white">{formatCountdown(countdown)}</span>
            <span className="text-white/70 text-sm mt-1">осталось</span>
          </div>
        </div>

        {/* Info card */}
        <div className="w-full bg-white rounded-2xl p-5 mb-6">
          <p className="font-bold text-gray-900 text-center mb-1">
            Автомобиль: {entry.plate_masked}
          </p>
          {entry.post_number && (
            <p className="text-gray-500 text-sm text-center">Пост №{entry.post_number}</p>
          )}
          <div className="mt-3 bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-800 text-center">
              Если не успеете — место сбросится автоматически
            </p>
          </div>
        </div>

        <button className="w-full bg-white text-blue-600 font-bold rounded-xl py-4 text-base">
          Я уже заезжаю ✓
        </button>
      </div>
    )
  }

  // Статус: ожидание
  const waitMinutes = settings ? calcWaitMinutes(entry.position, settings) : 0

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="w-20" />
        <h1 className="text-base font-semibold text-gray-900">Моя очередь</h1>
        <button
          onClick={() => setShowCancel(true)}
          className="text-sm text-red-500 w-20 text-right"
        >
          Отказаться
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Hero card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
          <p className="text-xs text-gray-500 text-center mb-1">Ваш номер в очереди</p>
          <p className="text-7xl font-bold text-blue-600 text-center leading-none">{entry.position}</p>
          <p className="text-lg font-semibold text-gray-900 text-center mt-2 tracking-wide">
            {entry.plate_masked}
          </p>
          <div className="border-t border-blue-200 mt-3 pt-3 flex justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{formatWaitTime(waitMinutes)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Позиция {entry.position}</span>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Уведомим вас, когда подойдёт очередь</p>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">После сигнала — 2 минуты на заезд</p>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex items-start gap-3">
            <Car className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Можете уехать и вернуться вовремя</p>
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4">
            <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto" />
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <X className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center">
              Покинуть очередь?
            </h2>
            <p className="text-sm text-gray-500 text-center">
              Ваш номер <strong>{entry.plate_masked}</strong> будет удалён.
              Чтобы вернуться, придётся встать в конец очереди заново.
            </p>
            <div className="space-y-2 pt-2 pb-4">
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="w-full bg-red-600 text-white font-bold rounded-xl py-3.5"
              >
                {cancelLoading ? 'Удаляем...' : 'Да, покинуть очередь'}
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="w-full border border-gray-200 text-gray-800 font-medium rounded-xl py-3.5"
              >
                Нет, остаться
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
