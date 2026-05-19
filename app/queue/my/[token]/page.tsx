'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCountdown, formatWaitTime, calcWaitMinutes, remainingSeconds } from '@/lib/queue'
import type { QueueEntry, WashSettings } from '@/types'

type PageState = 'waiting' | 'your_turn' | 'washing' | 'timeout' | 'done'

export default function MyQueuePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [entry, setEntry] = useState<QueueEntry | null>(null)
  const [settings, setSettings] = useState<WashSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const [elapsedWash, setElapsedWash] = useState(0)
  const [showWashConfirm, setShowWashConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [rating, setRating] = useState(0)

  const fetchEntry = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue/${token}`)
      if (!res.ok) { localStorage.removeItem('queue_session_token'); router.push('/queue'); return }
      const json = await res.json()
      setEntry(json.data)
      setSettings(json.settings)
    } finally { setLoading(false) }
  }, [token, router])

  useEffect(() => { fetchEntry() }, [fetchEntry])

  useEffect(() => {
    if (!entry?.id) return
    const supabase = createClient()
    const ch = supabase.channel(`entry_${entry.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queue_entries', filter: `id=eq.${entry.id}` },
        (payload) => {
          setEntry(payload.new as QueueEntry)
          if (['notified','entering'].includes(payload.new.status)) {
            if ('vibrate' in navigator) navigator.vibrate([300,100,300])
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [entry?.id])

  // Countdown for entering state
  useEffect(() => {
    if (!entry?.notified_at || !settings) return
    if (!['notified','entering'].includes(entry.status)) return
    const timeoutMs = (settings.entry_timeout || 2) * 60 * 1000
    const endsAt = new Date(new Date(entry.notified_at).getTime() + timeoutMs).toISOString()
    const tick = () => setCountdown(remainingSeconds(endsAt))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [entry?.notified_at, entry?.status, settings])

  // Elapsed wash timer
  useEffect(() => {
    if (entry?.status !== 'washing' || !entry.wash_started_at) return
    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(entry.wash_started_at!).getTime()) / 1000)
      setElapsedWash(secs)
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [entry?.status, entry?.wash_started_at])

  const handleCancel = async () => {
    setCancelLoading(true)
    try {
      const res = await fetch(`/api/queue/${token}`, { method: 'DELETE' })
      if (res.ok) { localStorage.removeItem('queue_session_token'); router.push('/queue') }
    } finally { setCancelLoading(false); setShowCancel(false) }
  }

  const handleWashDone = async () => {
    const res = await fetch('/api/operator/wash/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entry?.id, post_number: entry?.post_number, finish_by: 'client' }),
    })
    if (res.ok) { setShowWashConfirm(false); setShowSuccess(true) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-container" />
    </div>
  )
  if (!entry) return null

  // ── TIMEOUT ──────────────────────────────────────────────
  if (entry.status === 'timeout') return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <header className="w-full top-0 sticky bg-surface border-b border-outline-variant shadow-sm z-50">
        <div className="flex items-center justify-center px-container-margin h-14">
          <h1 className="text-[17px] font-semibold text-[#111827]">Время вышло</h1>
        </div>
      </header>
      <main className="flex-grow px-container-margin">
        <div className="flex flex-col items-center mt-[40px]">
          <div className="w-[120px] h-[120px] rounded-full bg-[#FEE2E2] flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-[56px] text-[#DC2626]">timer_off</span>
          </div>
          <h2 className="mt-4 text-[22px] font-bold text-[#111827] text-center leading-tight">Ваша очередь отменена</h2>
          <p className="mt-3 text-sm text-[#6B7280] text-center max-w-[280px] leading-relaxed">
            Вы не успели заехать в течение 2 минут. Место перешло следующему автомобилю.
          </p>
        </div>
        <div className="mt-stack-lg bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5" style={{'fontVariationSettings':"'FILL' 1"} as any}>info</span>
            <p className="text-sm text-[#374151] leading-snug">Очередь продолжается без вас.</p>
          </div>
        </div>
        <div className="mt-stack-lg grid grid-cols-2 gap-stack-sm">
          <div className="h-24 bg-surface-container-low rounded-xl flex flex-col justify-center items-center p-3 opacity-60">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Статус</span>
            <div className="flex items-center gap-1 text-error">
              <div className="w-2 h-2 rounded-full bg-error" />
              <span className="text-sm font-semibold">Таймаут</span>
            </div>
          </div>
          <div className="h-24 bg-surface-container-low rounded-xl flex flex-col justify-center items-center p-3 opacity-60">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Ожидание</span>
            <span className="text-sm font-semibold">~{settings?.avg_wash_time || 15} мин</span>
          </div>
        </div>
      </main>
      <footer className="fixed bottom-0 left-0 w-full bg-surface px-4 pt-4 pb-safe-area-bottom z-40">
        <div className="flex flex-col gap-3 mb-2">
          <button
            onClick={() => { localStorage.removeItem('queue_session_token'); router.push('/queue/join') }}
            className="w-full h-[52px] bg-[#2563EB] active:scale-[0.98] transition-all rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg">
            Встать в очередь заново
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
          <button onClick={() => { localStorage.removeItem('queue_session_token'); router.push('/queue') }}
            className="w-full py-2 text-[13px] text-[#6B7280] font-medium text-center">
            Или вернитесь позже
          </button>
        </div>
      </footer>
    </div>
  )

  // ── YOUR TURN ─────────────────────────────────────────────
  if (['notified','entering'].includes(entry.status)) {
    const isUrgent = countdown <= 30
    const totalSecs = (settings?.entry_timeout || 2) * 60
    const progress = countdown / totalSecs
    const r = 44, circ = 2 * Math.PI * r
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-6 transition-colors duration-500 ${isUrgent ? 'bg-[#DC2626]' : 'bg-primary-container'}`}>
        <div className="bg-white/15 rounded-full px-4 py-1.5 mb-6">
          <span className="text-white text-xs font-bold tracking-widest uppercase">Ваша очередь!</span>
        </div>
        <h1 className="text-3xl font-bold text-white text-center mb-8">Заезжайте прямо сейчас!</h1>
        <div className="relative w-48 h-48 mb-8">
          <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6"/>
            <circle cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              style={{transition:'stroke-dashoffset 1s linear'}}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white">{formatCountdown(countdown)}</span>
            <span className="text-white/70 text-sm mt-1">осталось</span>
          </div>
        </div>
        <div className="w-full bg-white rounded-2xl p-5 mb-6">
          <p className="font-bold text-gray-900 text-center mb-1">Автомобиль: {entry.plate_masked}</p>
          {entry.post_number && <p className="text-gray-500 text-sm text-center">Пост №{entry.post_number}</p>}
          <div className="mt-3 bg-[#FFFBEB] rounded-xl p-3">
            <p className="text-xs text-[#92400E] text-center">Если не успеете — место сбросится автоматически</p>
          </div>
        </div>
        <button className="w-full bg-white text-primary-container font-bold rounded-xl py-4 text-base active:scale-[0.98]">
          Я уже заезжаю ✓
        </button>
      </div>
    )
  }

  // ── WASHING ───────────────────────────────────────────────
  if (entry.status === 'washing') {
    const totalWash = (settings?.avg_wash_time || 15) * 60
    const progress = Math.min((elapsedWash / totalWash) * 100, 100)
    const mins = Math.floor(elapsedWash / 60)
    const secs = elapsedWash % 60
    const elapsed = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`
    return (
      <div className="bg-background font-body text-on-surface min-h-screen flex flex-col">
        <header className="flex justify-center items-center px-container-margin h-14 w-full bg-surface border-b border-outline-variant">
          <h1 className="font-semibold text-[17px] text-on-surface">Мойка идёт</h1>
        </header>
        <main className="flex-grow pb-40 overflow-y-auto">
          {/* Hero */}
          <div className="mx-container-margin mt-stack-md p-stack-md rounded-xl bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] border border-[#A7F3D0] shadow-sm flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#16A34A] rounded-full animate-pulse-green" />
              <span className="text-[13px] font-semibold text-[#16A34A]">В процессе мойки</span>
            </div>
            <div className="mt-3">
              <span className="material-symbols-outlined text-[56px] text-[#16A34A]">local_car_wash</span>
            </div>
            <div className="mt-2 text-center">
              <div className="font-plate-number text-plate-number text-on-surface tracking-[2px]">{entry.plate_masked}</div>
              {entry.post_number && <div className="text-[14px] text-on-surface-variant mt-1">Пост №{entry.post_number}</div>}
            </div>
          </div>
          {/* Timer */}
          <div className="mt-stack-lg flex flex-col items-center">
            <span className="text-[12px] uppercase tracking-wider text-on-surface-variant font-medium">Время мойки</span>
            <span className="text-[40px] font-bold text-on-surface leading-tight">{elapsed}</span>
            <div className="w-full px-container-margin mt-stack-sm">
              <div className="w-full bg-[#E5E7EB] h-[6px] rounded-full overflow-hidden">
                <div className="bg-[#16A34A] h-full rounded-full transition-all duration-1000" style={{width:`${progress}%`}} />
              </div>
              <div className="flex justify-between mt-2 px-1">
                <span className="text-[11px] font-medium text-on-surface-variant">0</span>
                <span className="text-[11px] font-medium text-on-surface-variant">~{settings?.avg_wash_time || 15} мин</span>
              </div>
            </div>
          </div>
          {/* Info card */}
          <div className="mx-container-margin mt-stack-lg bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-[20px]">info</span>
              <h3 className="text-[14px] font-semibold text-on-surface">Что дальше?</h3>
            </div>
            <div className="h-[1px] bg-outline-variant w-full mb-3" />
            <div className="space-y-stack-md">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#16A34A] text-[20px]" style={{'fontVariationSettings':"'FILL' 1"} as any}>check_circle</span>
                <p className="text-[14px] text-[#374151]">Дождитесь окончания мойки</p>
              </div>
              <div className="flex items-start gap-3 text-on-surface-variant">
                <div className="w-5 h-5 border-2 border-outline-variant rounded-[4px] mt-0.5" />
                <p className="text-[14px] text-[#374151]">Нажмите кнопку ниже когда закончите</p>
              </div>
              <div className="flex items-start gap-3 text-on-surface-variant">
                <div className="w-5 h-5 border-2 border-outline-variant rounded-[4px] mt-0.5" />
                <p className="text-[14px] text-[#374151]">Освободите пост для следующего</p>
              </div>
            </div>
          </div>
        </main>
        <footer className="fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-md pt-4 px-container-margin border-t border-transparent" style={{paddingBottom:'calc(16px + env(safe-area-inset-bottom, 34px))'}}>
          <button
            onClick={() => setShowWashConfirm(true)}
            className="w-full h-[52px] bg-[#16A34A] active:scale-[0.98] transition-all rounded-xl flex items-center justify-center gap-2 text-white font-bold text-[16px] shadow-lg">
            Мойка завершена — освобождаю пост
            <span className="material-symbols-outlined text-[20px]">check</span>
          </button>
          <p className="text-[12px] text-on-surface-variant text-center mt-3 pb-4">⚠️ Нажмите только после выезда с поста</p>
        </footer>

        {/* Wash confirm modal */}
        {showWashConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50" style={{minHeight:400}}>
            <div className="fixed inset-x-0 bottom-0 z-50">
              <div className="bg-surface-container-lowest rounded-t-[20px] shadow-2xl">
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-9 h-1 bg-[#D1D5DB] rounded-full" />
                </div>
                <div className="px-5 pt-4 pb-stack-lg flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#16A34A]" style={{fontSize:32,'fontVariationSettings':"'wght' 600"} as any}>check</span>
                  </div>
                  <h2 className="mt-3 text-[20px] font-bold text-[#111827] text-center">Вы завершили мойку?</h2>
                  <p className="mt-3 text-[14px] text-[#6B7280] text-center leading-normal">
                    Убедитесь, что вы уже выехали с поста. После подтверждения место освободится для следующего автомобиля.
                  </p>
                  <div className="mt-3 w-full bg-[#FFFBEB] rounded-xl p-3 flex items-center gap-2">
                    <span className="text-[14px]">⚠️</span>
                    <span className="text-[13px] text-[#92400E] font-medium">Это действие нельзя отменить</span>
                  </div>
                  <div className="mt-4 w-full flex flex-col gap-2">
                    <button onClick={handleWashDone}
                      className="w-full h-12 bg-[#16A34A] text-white font-bold rounded-xl active:scale-[0.98] transition-transform">
                      Да, я выехал с поста
                    </button>
                    <button onClick={() => setShowWashConfirm(false)}
                      className="w-full h-12 bg-white border border-[#E5E7EB] text-[#111827] font-bold rounded-xl active:scale-[0.98] transition-transform">
                      Нет, ещё моюсь
                    </button>
                  </div>
                  <div className="h-safe-area-bottom" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── SUCCESS / DONE ────────────────────────────────────────
  if (entry.status === 'done' || showSuccess) return (
    <div className="bg-surface-container-lowest min-h-screen flex flex-col items-center justify-between font-body text-on-surface">
      <section className="w-full h-[353px] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="confetti top-1/4 left-1/4 w-3 h-3 bg-[#16A34A] rounded-full opacity-60" style={{animationDelay:'0.2s'}} />
        <div className="confetti top-1/3 right-1/4 w-4 h-2 bg-[#86EFAC] rounded-sm opacity-60" style={{animationDelay:'0.5s'}} />
        <div className="confetti bottom-1/4 left-1/3 w-2 h-4 bg-[#BBF7D0] rounded-full opacity-60" style={{animationDelay:'0.8s'}} />
        <div className="confetti top-1/2 right-1/3 w-3 h-3 bg-[#16A34A] rotate-45 opacity-60" style={{animationDelay:'1.1s'}} />
        <div className="relative w-[140px] h-[140px] bg-[#DCFCE7] rounded-full flex items-center justify-center">
          <svg className="w-[64px] h-[64px] text-[#16A34A]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
            <path className="animate-stroke" d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      </section>
      <main className="w-full max-w-md px-container-margin flex-1">
        <div className="text-center space-y-stack-sm mb-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Спасибо! Приятной поездки 👋</h1>
          <p className="font-body text-body text-on-surface-variant max-w-[280px] mx-auto">
            Мойка успешно завершена. Ваше место освобождено для следующего.
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-5 space-y-stack-md">
          <div className="text-center">
            <h2 className="font-body font-semibold text-on-surface text-[14px]">Оцените качество мойки</h2>
            <div className="flex justify-center gap-2 mt-stack-md">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setRating(i)} className="transition-transform active:scale-90">
                  <span className={`material-symbols-outlined text-[32px] ${i <= rating ? 'text-[#F59E0B]' : 'text-[#D1D5DB]'}`}
                    style={i <= rating ? {'fontVariationSettings':"'FILL' 1"} as any : {}}>star</span>
                </button>
              ))}
            </div>
            <p className="font-small text-small text-outline mt-stack-sm">Нажмите на звезду чтобы оценить</p>
          </div>
          <textarea
            className="w-full h-[80px] rounded-lg border border-outline-variant p-3 font-body text-body focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-surface-container-lowest outline-none transition-all placeholder:text-outline-variant"
            placeholder="Оставьте комментарий (необязательно)" />
          <button className="w-full h-11 bg-primary text-on-primary font-body font-semibold rounded-xl active:scale-[0.98] transition-all hover:bg-surface-tint">
            Отправить оценку
          </button>
        </div>
      </main>
      <footer className="w-full max-w-md px-container-margin pb-safe-area-bottom pt-stack-lg flex flex-col items-center gap-stack-sm">
        <button
          onClick={() => { localStorage.removeItem('queue_session_token'); router.push('/queue/join') }}
          className="font-body font-semibold text-primary text-[14px] px-6 py-2 rounded-full active:bg-primary-container/10 transition-colors">
          Встать в очередь снова
        </button>
        <p className="font-small text-small text-outline mb-4">Возвращайтесь — будем рады!</p>
      </footer>
    </div>
  )

  // ── WAITING ───────────────────────────────────────────────
  const waitMinutes = settings ? calcWaitMinutes(entry.position, settings) : 0
  return (
    <div className="bg-background text-on-background font-body text-body w-full max-w-[390px] mx-auto min-h-screen relative overflow-x-hidden pb-[100px]">
      {/* Nav */}
      <header className="flex justify-between items-center w-full px-container-margin h-14 bg-surface sticky top-0 z-50">
        <div className="w-20" />
        <h1 className="text-[17px] font-bold text-on-surface">Моя очередь</h1>
        <button onClick={() => setShowCancel(true)} className="w-20 text-[14px] text-[#DC2626] font-medium text-right active:opacity-60 transition-opacity">
          Отказаться
        </button>
      </header>

      <main className="mt-stack-sm">
        {/* Hero */}
        <section className="mx-container-margin bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] rounded-[16px] p-6 text-center flex flex-col items-center">
          <span className="text-[12px] text-[#6B7280] mb-2">Ваш номер в очереди</span>
          <div className="text-[72px] leading-tight font-bold text-[#2563EB] mb-1">{entry.position}</div>
          <div className="font-plate-number text-[18px] text-[#111827] tracking-[2px] bg-white px-4 py-1 rounded-lg border border-[#BFDBFE] mb-6">
            {entry.plate_masked}
          </div>
          <div className="w-full h-px bg-[#BFDBFE] mb-4" />
          <div className="flex justify-between w-full px-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#6B7280]">schedule</span>
              <span className="text-[13px] text-[#6B7280]">{formatWaitTime(waitMinutes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#6B7280]">groups</span>
              <span className="text-[13px] text-[#6B7280]">{entry.position} в очереди</span>
            </div>
          </div>
        </section>

        {/* Queue visualizer — показываем до 5 позиций */}
        <section className="mt-stack-md px-container-margin mb-stack-lg">
          <div className="flex justify-between items-center relative py-4">
            <div className="absolute top-[32px] left-4 right-4 h-[2px] bg-[#E5E7EB] -z-10" />
            {[1,2,3,4,5].map(pos => {
              const isCurrent = pos === entry.position
              const isPast = pos < entry.position
              return (
                <div key={pos} className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-small
                    ${isCurrent ? 'bg-[#2563EB] shadow-lg scale-110' : isPast ? 'bg-[#E5E7EB] text-on-surface-variant' : 'bg-white border border-[#D1D5DB] text-[#D1D5DB]'}`}>
                    {isCurrent
                      ? <span className="material-symbols-outlined text-white text-[18px]" style={{'fontVariationSettings':"'FILL' 1"} as any}>local_car_wash</span>
                      : pos}
                  </div>
                  <span className={`text-[11px] font-${isCurrent ? 'bold text-[#2563EB]' : 'small text-[#D1D5DB]'}`}>
                    {isCurrent ? `${pos} — вы` : pos}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <h3 className="text-[14px] font-bold text-[#111827] px-container-margin mb-stack-sm">Статус очереди</h3>
        <div className="px-container-margin flex flex-col gap-stack-sm mb-stack-lg">
          <div className="bg-white rounded-xl p-4 flex items-center justify-between border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-2.5 bg-[#22C55E] rounded-full pulse-green" />
              <div>
                <div className="text-[13px] text-[#6B7280]">Сейчас моется</div>
                <div className="text-[15px] font-bold text-[#111827] font-plate-number tracking-wider">—</div>
              </div>
            </div>
            <span className="px-3 py-1 bg-[#F0FDF4] text-[#166534] text-[12px] font-bold rounded-full border border-[#BBF7D0]">Моется</span>
          </div>
          <div className="bg-surface rounded-xl p-4 flex items-center justify-between border border-dashed border-[#D1D5DB]">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-2.5 border border-[#D1D5DB] rounded-full" />
              <div>
                <div className="text-[13px] text-[#6B7280]">Следующий</div>
                <div className="text-[15px] font-bold text-[#111827] font-plate-number tracking-wider opacity-60">{entry.plate_masked}</div>
              </div>
            </div>
            <span className="px-3 py-1 bg-[#F1F3FF] text-[#0053DB] text-[12px] font-bold rounded-full border border-[#DCE2F7]">Ожидает</span>
          </div>
        </div>

        {/* Info */}
        <section className="mx-container-margin bg-white rounded-xl border border-[#E5E7EB] shadow-sm mb-stack-lg">
          <div className="p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#2563EB] text-[20px]">notifications_active</span>
            <span className="text-[14px] text-[#374151]">Уведомим вас, когда подойдёт очередь</span>
          </div>
          <div className="mx-4 h-px bg-[#E5E7EB]" />
          <div className="p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#F59E0B] text-[20px]">timer</span>
            <span className="text-[14px] text-[#374151]">После сигнала — 2 минуты на заезд</span>
          </div>
          <div className="mx-4 h-px bg-[#E5E7EB]" />
          <div className="p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6B7280] text-[20px]">directions_car</span>
            <span className="text-[14px] text-[#374151]">Можете уехать и вернуться вовремя</span>
          </div>
        </section>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center bg-surface pt-2 pb-safe-area-bottom px-4 border-t border-outline-variant shadow-lg z-50">
        <a href="/queue" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1">
          <span className="material-symbols-outlined">queue</span>
          <span className="text-[13px] font-small mt-1">Очередь</span>
        </a>
        <a href="#" className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-xl px-4 py-1">
          <span className="material-symbols-outlined" style={{'fontVariationSettings':"'FILL' 1"} as any}>local_car_wash</span>
          <span className="text-[13px] font-bold mt-1">Мойка</span>
        </a>
        <a href="#" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1">
          <span className="material-symbols-outlined">history</span>
          <span className="text-[13px] font-small mt-1">История</span>
        </a>
        <a href="#" className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-1">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[13px] font-small mt-1">Профиль</span>
        </a>
      </nav>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 overflow-hidden" style={{minHeight:400}}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCancel(false)} />
          <div className="absolute inset-x-0 bottom-0 z-10">
            <div className="bg-surface-container-lowest rounded-t-[20px] shadow-2xl flex flex-col items-center">
              <div className="w-9 h-1 bg-[#D1D5DB] rounded-full mt-3" />
              <div className="w-full px-5 pt-8 pb-safe-area-bottom">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-[#FEE2E2] rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#DC2626] text-[40px]">delete</span>
                  </div>
                  <h2 className="mt-3 font-headline-md text-headline-md text-[#111827]">Покинуть очередь?</h2>
                  <p className="mt-4 font-body text-[14px] text-[#6B7280] leading-relaxed">
                    Ваш номер <span className="font-bold text-[#111827]">{entry.plate_masked}</span> будет удалён из очереди. Чтобы вернуться, придётся встать в конец заново.
                  </p>
                </div>
                <div className="mt-4 p-3 bg-[#F9FAFB] rounded-xl flex items-center gap-3 border border-[#E5E7EB]">
                  <div className="w-8 h-8 bg-[#DBEAFE] rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[#2563EB] font-bold text-[13px]">{entry.position}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] text-[#111827]">Текущая позиция — {entry.position}</span>
                    <span className="font-small text-[13px] text-[#6B7280]">{formatWaitTime(waitMinutes)}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button onClick={handleCancel} disabled={cancelLoading}
                    className="w-full h-12 bg-[#DC2626] text-white font-bold rounded-xl active:scale-95 transition-transform duration-150">
                    {cancelLoading ? 'Удаляем...' : 'Да, покинуть очередь'}
                  </button>
                  <button onClick={() => setShowCancel(false)}
                    className="w-full h-12 bg-white border border-[#E5E7EB] text-[#111827] font-bold rounded-xl active:scale-95 transition-transform duration-150">
                    Нет, остаться в очереди
                  </button>
                </div>
                <div className="h-safe-area-bottom" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
