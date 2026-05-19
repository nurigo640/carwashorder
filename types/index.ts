// ============================================================
// Типы данных — Система очереди автомойки
// ============================================================

export type QueueStatus =
  | 'waiting'    // ожидает в очереди
  | 'notified'   // получил уведомление, едет
  | 'entering'   // 2-минутный таймаут заезда активен
  | 'washing'    // моется
  | 'done'       // мойка завершена
  | 'timeout'    // не приехал за 2 минуты
  | 'cancelled'; // отказался сам

export type FinishMode = 'manual' | 'timer' | 'combined';
export type EntrySource = 'client' | 'operator';
export type FinishBy = 'operator' | 'timer' | 'client';

export interface WashSettings {
  id: string;
  name: string;
  is_open: boolean;
  active_posts: number;
  max_posts: number;
  avg_wash_time: number;   // минут
  entry_timeout: number;   // минут
  max_queue_size: number;
  finish_mode: FinishMode;
  updated_at: string;
}

export interface QueueEntry {
  id: string;
  plate_number: string;
  plate_masked: string;
  position: number;
  session_token: string;
  status: QueueStatus;
  source: EntrySource;
  operator_note?: string;
  post_number?: number;
  shift_id?: string;
  notified_at?: string;
  wash_started_at?: string;
  wash_ended_at?: string;
  finish_by?: FinishBy;
  removal_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface WashPost {
  id: string;
  post_number: number;
  is_active: boolean;
  current_entry_id?: string;
  timer_started_at?: string;
  timer_ends_at?: string;
  // join
  current_entry?: QueueEntry;
}

export interface Operator {
  id: string;
  name: string;
  login: string;
  is_active: boolean;
  created_at: string;
}

export interface Shift {
  id: string;
  operator_id: string;
  started_at: string;
  ended_at?: string;
  total_washed: number;
  total_timeout: number;
  total_removed: number;
  // join
  operator?: Operator;
}

export interface RemovalReason {
  id: string;
  label: string;
  sort_order: number;
}

// ─── API response types ──────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface JoinQueueRequest {
  plate_number: string;
}

export interface JoinQueueResponse {
  entry: QueueEntry;
  session_token: string;
  estimated_wait_minutes: number;
}

export interface AddByOperatorRequest {
  plate_number: string;
  note?: string;
  shift_id: string;
}

export interface StartWashRequest {
  post_number: number;
  shift_id: string;
}

export interface FinishWashRequest {
  finish_by: FinishBy;
  shift_id: string;
}

export interface RemoveEntryRequest {
  reason: string;
  shift_id: string;
}

// ─── Client-side computed types ──────────────────────────────

export interface QueueEntryWithWait extends QueueEntry {
  estimated_wait_minutes: number;
}

export interface PostWithEntry extends WashPost {
  current_entry?: QueueEntry;
  elapsed_seconds?: number;
  remaining_seconds?: number;
}
