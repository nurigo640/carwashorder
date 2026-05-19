'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatWaitTime, calcWaitMinutes } from '@/lib/queue'
import type { QueueEntry, WashSettings } from '@/types'

export default function QueuePage() {
  const router = useRouter()
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [settings, setSettings] = useState<WashSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isOnline, setIsOnline] = useState(true)

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEntries(json.entries || [])
      setSettings(json.settings)
      setLastUpdated(new Date())
      setIsOnline(true)
    } catch {
      setIsOnline(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('queue_session_token')
    if (token) { router.push(`/queue/my/${token}`); return }
    fetchQueue()
  }, [fetchQueue, router])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel('queue_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, fetchQueue)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchQueue])

  const active = entries.filter(e => ['waiting','notified','entering','washing'].includes(e.status))

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-container" />
    </div>
  )

  if (settings && !settings.is_open) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface px-4 text-center">
      <div className="text-6xl mb-4">🚗</div>
      <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Мойка закрыта</h1>
      <p className="font-small text-small text-on-surface-variant">Приходите позже</p>
    </div>
  )

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col max-w-[390px] mx-auto overflow-x-hidden">
      {/* Status bar sim */}
      <div className="h-11 flex items-center justify-between px-6 bg-surface">
        <span className="text-[15px] font-semibold">
          {new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined" style={{fontSize:18}}>signal_cellular_4_bar</span>
          <span className="material-symbols-outlined" style={{fontSize:18}}>wifi</span>
          <span className="material-symbols-outlined" style={{fontSize:18}}>battery_full</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-surface px-container-margin py-4 text-center border-b border-outline-variant">
        <div className="font-small text-small text-on-surface-variant mb-1">{settings?.name || 'АвтоМойка Про'}</div>
        <h1 className="font-headline-lg text-headline-lg text-on-background">Очередь на мойку</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-secondary pulse-dot' : 'bg-error'}`} />
          <span className="font-small text-small text-on-surface-variant">
            {isOnline ? 'Обновлено только что' : 'Нет соединения'}
          </span>
        </div>
      </header>

      {/* Queue list */}
      <main className="flex-1 px-container-margin py-stack-lg space-y-3 pb-40">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-primary-fixed rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary" style={{fontSize:40}}>local_car_wash</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-background mb-1">Очередь пуста</h2>
            <p className="font-small text-small text-on-surface-variant">Вы можете заехать прямо сейчас!</p>
          </div>
        ) : (
          <>
            {active.map((entry, i) => {
              const isWashing = entry.status === 'washing'
              const wait = settings ? formatWaitTime(calcWaitMinutes(entry.position, settings)) : ''
              return (
                <div key={entry.id}
                  className={`bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm flex items-center gap-4 transition-transform active:scale-[0.98]
                    ${isWashing ? 'border-l-4 border-l-primary-container shadow-lg' : ''}`}>
                  <div className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center
                    ${isWashing ? 'bg-primary-fixed' : 'bg-surface-container-low'}`}>
                    <span className="font-headline-md text-headline-md text-primary">{entry.position}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-plate-number text-[16px] tracking-[2px] font-semibold text-on-surface leading-tight uppercase">
                      {entry.plate_masked}
                    </div>
                    <div className="font-small text-small text-on-surface-variant">
                      {isWashing ? 'Моется сейчас' : wait}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[13px] font-semibold
                    ${isWashing ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#DBEAFE] text-[#2563EB]'}`}>
                    {isWashing ? 'Моется' : 'Ожидает'}
                  </div>
                </div>
              )
            })}
            <div className="text-center pt-2">
              <p className="font-small text-small text-on-surface-variant">В очереди {active.length} автомобилей</p>
            </div>
          </>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 w-full max-w-[390px] mx-auto z-50">
        <div className="bg-gradient-to-t from-surface via-surface/95 to-transparent pt-8 pb-4 px-container-margin">
          <button
            onClick={() => router.push('/queue/join')}
            className="w-full h-[52px] bg-primary-container text-on-primary rounded-xl font-bold text-headline-md flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
            Встать в очередь
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <nav className="flex justify-around items-center px-4 pb-safe-area-bottom h-20 bg-surface border-t border-outline-variant">
          <a href="#" className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1">
            <span className="material-symbols-outlined" style={{'fontVariationSettings':"'FILL' 1"} as any}>format_list_numbered</span>
            <span className="font-small text-small">Очередь</span>
          </a>
          <a href="#" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1">
            <span className="material-symbols-outlined">calendar_today</span>
            <span className="font-small text-small">Мои записи</span>
          </a>
          <a href="#" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1">
            <span className="material-symbols-outlined">person</span>
            <span className="font-small text-small">Профиль</span>
          </a>
        </nav>
      </div>
    </div>
  )
}
