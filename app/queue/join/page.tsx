'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validatePlate, normalizePlate } from '@/lib/queue'

export default function JoinQueuePage() {
  const router = useRouter()
  const [plate, setPlate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  const handleSubmit = async () => {
    const normalized = normalizePlate(plate)
    if (!validatePlate(normalized)) {
      setError('Неверный формат номера. Пример: А123ВС777')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate_number: normalized }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409 && json.data?.session_token) {
          localStorage.setItem('queue_session_token', json.data.session_token)
          router.push(`/queue/my/${json.data.session_token}`)
          return
        }
        setError(json.error || 'Ошибка. Попробуйте ещё раз.')
        return
      }
      const token = json.data.session_token
      localStorage.setItem('queue_session_token', token)
      router.push(`/queue/my/${token}`)
    } catch {
      setError('Нет соединения. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col overflow-x-hidden">
      {/* TopAppBar */}
      <header className="flex items-center px-container-margin h-14 w-full z-50 bg-surface border-b border-outline-variant sticky top-0">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-start text-[#111827] active:opacity-70 transition-opacity">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="flex-grow text-center text-[17px] font-semibold text-[#111827]">Встать в очередь</h1>
        <div className="w-10" />
      </header>

      <main className="flex-grow flex flex-col px-container-margin pt-stack-lg pb-stack-lg">
        {/* Plate illustration */}
        <div className="flex justify-center items-center h-20 mb-stack-md">
          <div className="plate-container w-48 h-12 rounded-lg flex items-center justify-center overflow-hidden">
            <div className="text-[#9CA3AF] font-plate-number tracking-[6px] text-lg">_ _ _ _ _ _</div>
            <div className="plate-side-strip" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-stack-lg">
          <h2 className="font-headline-md text-[#111827] mb-2">Введите номер автомобиля</h2>
          <p className="font-small text-[#6B7280] max-w-[280px] mx-auto">
            Мы добавим вас в очередь и сообщим, когда придёт ваша очередь
          </p>
        </div>

        {/* Input */}
        <div className="space-y-stack-sm mb-stack-md">
          <label className="font-small text-[#6B7280] ml-1">Гос. номер</label>
          <div className="relative group">
            <input
              type="text"
              value={plate}
              onChange={e => {
                setPlate(e.target.value.toUpperCase())
                setError('')
                setShowCursor(e.target.value.length === 0)
              }}
              placeholder="А 000 АА 000"
              maxLength={12}
              autoComplete="off"
              autoCorrect="off"
              className={`w-full h-14 bg-surface-container-lowest rounded-xl border text-center font-plate-number text-plate-number focus:ring-4 focus:ring-[#DBEAFE] focus:border-primary-container outline-none transition-all placeholder:text-[#9CA3AF]
                ${error ? 'border-error' : 'border-primary-container'}`}
            />
            {showCursor && (
              <div className="absolute inset-y-0 left-[34px] flex items-center pointer-events-none">
                <span className="cursor-blink text-primary-container font-plate-number text-plate-number">|</span>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-error text-center">{error}</p>}
        </div>

        {/* Warning banner */}
        <div className="bg-[#FFFBEB] border-l-4 border-[#F59E0B] rounded-xl p-stack-md flex gap-3 items-start shadow-sm">
          <span className="material-symbols-outlined text-[#F59E0B] text-[18px]" style={{'fontVariationSettings':"'FILL' 1"} as any}>warning</span>
          <p className="font-small text-[#92400E] leading-tight">
            Когда подойдёт ваша очередь, у вас будет <span className="font-bold">2 минуты</span> чтобы начать мойку — иначе место сбросится
          </p>
        </div>
      </main>

      {/* Bottom */}
      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-md px-container-margin pb-safe-area-bottom pt-4 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={loading || plate.length < 6}
          className="w-full h-[52px] bg-primary-container hover:bg-primary text-on-primary font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center shadow-lg shadow-primary-container/20 disabled:opacity-40">
          {loading ? 'Добавляем...' : 'Подтвердить и встать в очередь'}
        </button>
        <p className="text-center text-[12px] text-[#6B7280] font-small pb-2">
          Вы всегда можете отказаться от очереди
        </p>
      </footer>
    </div>
  )
}
