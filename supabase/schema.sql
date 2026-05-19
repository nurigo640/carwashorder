-- ============================================================
-- Система электронной очереди автомойки
-- Supabase Schema — MVP Этап 1
-- ============================================================

-- Расширения
create extension if not exists "uuid-ossp";

-- ============================================================
-- ТАБЛИЦА: настройки мойки
-- ============================================================
create table wash_settings (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null default 'АвтоМойка',
  is_open         boolean not null default true,
  active_posts    int not null default 1 check (active_posts between 1 and 10),
  max_posts       int not null default 10,
  avg_wash_time   int not null default 15 check (avg_wash_time between 5 and 60),  -- минут
  entry_timeout   int not null default 2  check (entry_timeout between 1 and 10),  -- минут
  max_queue_size  int not null default 20,
  finish_mode     text not null default 'combined' check (finish_mode in ('manual','timer','combined')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Одна запись настроек для мойки
insert into wash_settings (name) values ('АвтоМойка Про');

-- ============================================================
-- ТАБЛИЦА: операторы
-- ============================================================
create table operators (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  login       text not null unique,
  password_hash text not null,
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- ТАБЛИЦА: владельцы
-- ============================================================
create table owners (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  login       text not null unique,
  password_hash text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- ТАБЛИЦА: смены
-- ============================================================
create table shifts (
  id            uuid primary key default uuid_generate_v4(),
  operator_id   uuid not null references operators(id),
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  total_washed  int not null default 0,
  total_timeout int not null default 0,
  total_removed int not null default 0
);

-- ============================================================
-- ТАБЛИЦА: очередь
-- ============================================================
create table queue_entries (
  id              uuid primary key default uuid_generate_v4(),
  plate_number    text not null,                          -- гос. номер
  plate_masked    text not null,                          -- маскированный А***ВС 777
  position        int not null,                           -- позиция в очереди
  session_token   text not null unique default uuid_generate_v4()::text, -- токен клиента
  status          text not null default 'waiting'
                    check (status in ('waiting','notified','entering','washing','done','timeout','cancelled')),
  source          text not null default 'client'
                    check (source in ('client','operator')),  -- кто добавил
  operator_note   text,                                   -- комментарий оператора при ручном добавлении
  post_number     int,                                    -- номер поста
  shift_id        uuid references shifts(id),
  notified_at     timestamptz,                            -- когда отправлено уведомление
  wash_started_at timestamptz,                            -- когда началась мойка
  wash_ended_at   timestamptz,                            -- когда завершилась мойка
  finish_by       text check (finish_by in ('operator','timer','client')), -- кто завершил
  removal_reason  text,                                   -- причина удаления
  created_at      timestamptz not null default now(),
  updated_at      timestamptz default now()
);

-- Индексы
create index idx_queue_status    on queue_entries(status);
create index idx_queue_position  on queue_entries(position);
create index idx_queue_plate     on queue_entries(plate_number);
create index idx_queue_token     on queue_entries(session_token);
create index idx_queue_created   on queue_entries(created_at);

-- ============================================================
-- ТАБЛИЦА: посты мойки
-- ============================================================
create table wash_posts (
  id              uuid primary key default uuid_generate_v4(),
  post_number     int not null unique check (post_number between 1 and 10),
  is_active       boolean not null default false,
  current_entry_id uuid references queue_entries(id),
  timer_started_at timestamptz,
  timer_ends_at   timestamptz
);

-- Создаём 10 постов
insert into wash_posts (post_number, is_active) values
  (1, true),(2, false),(3, false),(4, false),(5, false),
  (6, false),(7, false),(8, false),(9, false),(10, false);

-- ============================================================
-- ТАБЛИЦА: причины удаления
-- ============================================================
create table removal_reasons (
  id    uuid primary key default uuid_generate_v4(),
  label text not null,
  sort_order int not null default 0
);

insert into removal_reasons (label, sort_order) values
  ('Клиент уехал самостоятельно', 1),
  ('Клиент отказался от мойки',   2),
  ('Технический сбой',            3),
  ('Конфликтная ситуация',        4),
  ('Другое',                      5);

-- ============================================================
-- ФУНКЦИЯ: получить следующую позицию в очереди
-- ============================================================
create or replace function next_queue_position()
returns int language sql as $$
  select coalesce(max(position), 0) + 1
  from queue_entries
  where status in ('waiting','notified','entering','washing');
$$;

-- ============================================================
-- ФУНКЦИЯ: пересчитать позиции после удаления
-- ============================================================
create or replace function reorder_queue()
returns void language plpgsql as $$
declare
  rec record;
  pos int := 1;
begin
  for rec in
    select id from queue_entries
    where status in ('waiting','notified','entering')
    order by position asc
  loop
    update queue_entries set position = pos where id = rec.id;
    pos := pos + 1;
  end loop;
end;
$$;

-- ============================================================
-- ФУНКЦИЯ: маскировать номер А123ВС777 → А***ВС 777
-- ============================================================
create or replace function mask_plate(plate text)
returns text language plpgsql as $$
begin
  -- Простая маскировка: первый символ + *** + последние 2 буквы + пробел + регион
  return substring(plate, 1, 1) || '***' || substring(plate, 5, 2) || ' ' || substring(plate, 7);
end;
$$;

-- ============================================================
-- ТРИГГЕР: updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_queue_updated_at
  before update on queue_entries
  for each row execute function set_updated_at();

create trigger trg_settings_updated_at
  before update on wash_settings
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table wash_settings   enable row level security;
alter table queue_entries   enable row level security;
alter table wash_posts      enable row level security;
alter table operators       enable row level security;
alter table owners          enable row level security;
alter table shifts          enable row level security;
alter table removal_reasons enable row level security;

-- Публичное чтение настроек и очереди (для клиентского экрана)
create policy "public read settings"
  on wash_settings for select using (true);

create policy "public read queue"
  on queue_entries for select using (true);

create policy "public read posts"
  on wash_posts for select using (true);

create policy "public read reasons"
  on removal_reasons for select using (true);

-- Клиент может добавить себя в очередь
create policy "client insert queue"
  on queue_entries for insert
  with check (source = 'client');

-- Клиент может обновить только свою запись по session_token
create policy "client update own entry"
  on queue_entries for update
  using (session_token = current_setting('app.session_token', true));

-- Сервисная роль (API) имеет полный доступ — используется через service_role key
-- Все остальные операции (оператор, владелец) идут через API Routes с service_role

-- ============================================================
-- REALTIME
-- ============================================================
-- Включить realtime для таблиц очереди и постов
alter publication supabase_realtime add table queue_entries;
alter publication supabase_realtime add table wash_posts;
alter publication supabase_realtime add table wash_settings;
