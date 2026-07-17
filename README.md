# MarketPilot

AI-платформа для автоматизации маркетинга малого бизнеса.

## Возможности MVP

- Регистрация / вход по JWT (httpOnly cookie).
- Создание компании через 4-шаговый wizard.
- Ролевая модель: admin, marketer, owner.
- Приглашения в команду по ссылке (`/invite/<token>`), срок 7 дней.
- AI-аудит маркетинга после онбординга.
- Дорожная карта (roadmap) с задачами по категориям и приоритетами.
- Контент-план на 7/14/30 дней с генерацией постов.
- Генератор постов с режимами улучшения (короче / эмоциональнее / экспертнее).
- База знаний с RAG: ссылки, тексты, чанкинг, эмбеддинги в pgvector.
- Медиатека через публичные папки Яндекс.Диска.
- Чат с AI-ассистентом в контексте компании.
- Дашборд собственника с KPI и графиками (Recharts).
- Лента активности (Activity Log).

## Стек

- Next.js 16 + App Router + TypeScript
- Tailwind CSS + shadcn/ui (Base UI компоненты)
- PostgreSQL 15+ + Prisma ORM
- pgvector для векторного поиска
- Polza AI API (OpenAI-совместимый)
- Jose для JWT, bcryptjs для паролей

## Локальный запуск

### Требования

- Node.js 20+
- PostgreSQL 15+ с включённым расширением `pgvector`

### Настройка

1. Скопируйте переменные окружения:

```bash
cp .env.example .env
```

2. Запустите PostgreSQL локально и создайте БД:

```bash
createdb marketpilot
psql -d marketpilot -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

3. Установите зависимости и примените миграции:

```bash
npm install
npx prisma migrate dev
```

4. Запустите dev-сервер:

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`.

### Env-переменные

```
DATABASE_URL=postgresql://user:password@localhost:5432/marketpilot
POLZA_AI_API_KEY=sk-...
POLZA_AI_BASE_URL=https://api.polza.ai/v1
POLZA_AI_MODEL=gpt-4o-mini
POLZA_AI_EMBEDDING_MODEL=text-embedding-3-small
JWT_SECRET=минимум-32-символа
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Деплой на Railway

1. Создайте новый проект в Railway и подключите репозиторий GitHub.
2. Добавьте плагин **PostgreSQL** — переменная `DATABASE_URL` подтянется автоматически.
3. Включите `pgvector` в консоли БД:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

4. Установите env-переменные:
   - `POLZA_AI_API_KEY`
   - `POLZA_AI_BASE_URL=https://api.polza.ai/v1`
   - `POLZA_AI_MODEL`
   - `POLZA_AI_EMBEDDING_MODEL` (если доступна)
   - `JWT_SECRET` (сгенерируйте случайную строку ≥ 32 символов)
   - `NEXT_PUBLIC_APP_URL` (домен Railway после деплоя)

5. Railway автоматически использует скрипт `build` (`prisma migrate deploy && next build`) и `start` (`next start`).

## Структура проекта

```
app/
  (auth)/          # Страницы авторизации и приглашений
  (dashboard)/     # Основной интерфейс
  api/             # API routes
components/        # UI-компоненты (shadcn + свои)
lib/               # Хелперы, AI-обёртка, RAG, парсеры
prisma/            # Схема и миграции
```

## Важные замечания

- В MVP email-приглашения не отправляются автоматически — админ копирует ссылку и передаёт её вручную.
- Яндекс.Диск работает только с публичными папками.
- Перед запуском в продакшене замените `JWT_SECRET` и используйте реальный ключ Polza AI.
