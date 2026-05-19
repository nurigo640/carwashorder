import type { QueueEntry, WashSettings } from '@/types'

// Маскировка номера: А123ВС777 → А***ВС 777
export function maskPlate(plate: string): string {
  const clean = plate.replace(/\s/g, '').toUpperCase()
  if (clean.length < 6) return clean
  return clean[0] + '***' + clean.slice(4, 6) + ' ' + clean.slice(6)
}

// Нормализация номера: убрать пробелы, привести к верхнему регистру
export function normalizePlate(plate: string): string {
  return plate.replace(/\s/g, '').toUpperCase()
}

// Валидация российского гос. номера
export function validatePlate(plate: string): boolean {
  const normalized = normalizePlate(plate)
  // Стандартный формат: Б000ББ000 или Б000ББ00
  const pattern = /^[АВЕКМНОРСТУХABEKMHOPCTYX]\d{3}[АВЕКМНОРСТУХABEKMHOPCTYX]{2}\d{2,3}$/i
  return pattern.test(normalized)
}

// Расчёт времени ожидания в минутах
export function calcWaitMinutes(
  position: number,
  settings: WashSettings
): number {
  const carsAhead = Math.max(0, position - 1)
  return Math.ceil((carsAhead * settings.avg_wash_time) / settings.active_posts)
}

// Форматирование времени: 125 сек → "2:05"
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Форматирование времени ожидания: 45 → "~45 мин"
export function formatWaitTime(minutes: number): string {
  if (minutes === 0) return 'Прямо сейчас'
  if (minutes < 60) return `~${minutes} мин`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `~${h} ч ${m} мин` : `~${h} ч`
}

// Статус очереди → читаемый текст
export function statusLabel(status: QueueEntry['status']): string {
  const labels: Record<QueueEntry['status'], string> = {
    waiting:   'Ожидает',
    notified:  'Уведомлён',
    entering:  'Заезжает',
    washing:   'Моется',
    done:      'Завершено',
    timeout:   'Таймаут',
    cancelled: 'Отменено',
  }
  return labels[status]
}

// Получить прошедшее время в секундах
export function elapsedSeconds(from: string): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / 1000)
}

// Получить оставшееся время в секундах
export function remainingSeconds(endsAt: string): number {
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000))
}

// Проверить истёк ли таймер
export function isExpired(endsAt: string): boolean {
  return new Date(endsAt).getTime() < Date.now()
}
