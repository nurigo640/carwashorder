'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validatePlate, normalizePlate } from '@/lib/queue'
import { AlertTriangle, ChevronLeft } from 'lucide-react'

export default function JoinQueuePage() {
  const router = useRouter()
  const [plate, setPlate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [warned, setWarned] = useState(false)

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
        // Дубликат — перейти к существующей записи
        if (res.status === 409 && json.data?.session_token) {
          localStorage.setItem('queue_session_token', json.data.session_token)
          router.push(`/queue/my/${json.data.session_token}`)
          return
        }
        setError(json.error || 'Ошибка. Попробуйте ещё раз.')
        return
      }

      // Сохранить токен и перейти
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
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 mx-auto pr-7">
          Встать в очередь
        </h1>
      </div>

      <div className="px-6 pt-8 space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-12 border-2 border-blue-600 rounded-lg flex items-center justify-center bg-white">
            <span className="text-blue-300 text-lg tracking-widest font-bold">_ _ _ _</span>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Введите номер автомобиля</h2>
          <p className="text-sm text-gray-500 mt-2">
            Мы добавим вас в очередь и уведомим, когда придёт ваше время
          </p>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-sm text-gray-500">Гос. номер</label>
          <input
            type="text"
            value={plate}
            onChange={(e) => {
              setPlate(e.target.value.toUpperCase())
              setError('')
            }}
            placeholder="А 000 АА 000"
            className={`w-full h-14 rounded-xl border px-4 text-center text-2xl font-bold tracking-widest uppercase
              focus:outline-none focus:ring-2 focus:ring-blue-500 transition
              ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
            maxLength={9}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
          />
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        {/* Warning banner — всегда виден */}
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Когда подойдёт ваша очередь, у вас будет{' '}
            <strong>2 минуты</strong> чтобы начать мойку.
            Иначе очередь сбросится автоматически.
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-white border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={loading || plate.length < 6}
          className="w-full bg-blue-600 text-white font-bold text-base rounded-xl py-4 disabled:opacity-40
            active:bg-blue-700 transition-colors"
        >
          {loading ? 'Добавляем...' : 'Подтвердить и встать в очередь'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Вы всегда можете отказаться от очереди
        </p>
      </div>
    </main>
  )
}
