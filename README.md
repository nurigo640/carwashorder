# 🚗 Система электронной очереди автомойки

MVP Этап 1 — Next.js 14 + Supabase + Vercel

---

## Стек

- **Frontend/Backend**: Next.js 14 (App Router + API Routes), TypeScript, Tailwind CSS
- **Database + Realtime**: Supabase (PostgreSQL + WebSocket)
- **Деплой**: Vercel + GitHub

---

## Установка и запуск

### 1. Создать проект в Supabase
1. [supabase.com](https://supabase.com) → New Project
2. Settings → API → скопировать ключи

### 2. Применить схему базы данных
1. Supabase → SQL Editor
2. Вставить содержимое `supabase/schema.sql` → Run

### 3. Переменные окружения
```bash
cp .env.example .env.local
# Заполнить ключами из Supabase
```

### 4. Запуск
```bash
npm install && npm run dev
# http://localhost:3000
```

---

## Деплой на Vercel

```bash
git add . && git commit -m "Initial commit"
git remote add origin https://github.com/YOUR/carwash-queue.git
git push -u origin main
```

Vercel → New Project → Import GitHub repo → добавить env vars → Deploy

---

## Структура проекта

```
app/
├── queue/          # Клиентские экраны
│   ├── page.tsx           # Главная очередь
│   ├── join/page.tsx      # Ввод номера
│   └── my/[token]/        # Личный экран
├── operator/       # Кабинет оператора (в разработке)
├── owner/          # Кабинет владельца (в разработке)
└── api/
    ├── queue/             # GET список, POST добавить, DELETE отмена
    └── operator/          # Начать/завершить мойку, добавить авто
lib/
├── supabase.ts     # Клиенты Supabase
└── queue.ts        # Утилиты (маска номера, валидация, расчёты)
types/index.ts      # TypeScript типы
supabase/schema.sql # SQL схема БД
```

---

## Статус MVP

### ✅ Готово — Этап 1 (клиентская часть)
- Главный экран очереди с realtime обновлением
- Форма записи с валидацией номера
- Личный экран ожидания с таймером
- Экран «Ваша очередь» с обратным отсчётом
- Отмена очереди с подтверждением
- Экран таймаута
- API: вся очередная логика

### 🔄 В разработке — Оператор
- Авторизация и смена
- Управление постами
- Ручное добавление/удаление авто

### 📋 Запланировано — Владелец
- Настройки (посты, таймеры, режим)
- QR-код генератор
- Ссылка для 2ГИС
