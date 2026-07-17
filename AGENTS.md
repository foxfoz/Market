# AGENTS.md — MarketPilot

## Контекст

MarketPilot — full-stack Next.js-приложение (App Router). Все изменения должны сохранять совместимость с деплоем на Railway.

## Технический стек

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (компоненты на Base UI, НЕ Radix)
- PostgreSQL + Prisma 6 + pgvector
- JWT через `jose`, пароли через `bcryptjs`
- LLM: Polza AI API (OpenAI-совместимый) через пакет `openai`

## Важные правила

### Prisma

- Используем Prisma 6 (НЕ 7): в v7 изменилась работа с datasource URL и клиентом.
- URL базы задаётся в `schema.prisma` через `env("DATABASE_URL")`.
- Векторный тип — `Unsupported("vector(1536)")` в модели `KnowledgeChunk`.
- Для операций с векторами используем `$queryRawUnsafe` (см. `lib/rag.ts`, `lib/knowledge-processor.ts`).

### shadcn/ui / Base UI

- Компоненты shadcn в этом проекте построены на `@base-ui/react`, а не Radix.
- **Нет prop `asChild`** у `Button`, `SheetTrigger`, `DropdownMenuTrigger` и т.д.
- Вместо `asChild` передавай дочерние элементы напрямую или оборачивай ссылки/кнопки обычным образом.

### Аутентификация

- JWT хранится в httpOnly cookie `token`.
- Проверка пользователя — `getCurrentUser()` из `lib/auth.ts`.
- Доступ к компании проверяется через `requireMembership()` + `hasPermission()` / `canGenerate()` / `canMutate()`.

### AI и RAG

- Все промпты в `lib/prompts.ts`.
- Контекст компании собирается в `lib/context.ts` — включает карточку компании, каналы, выполненные задачи, медиатеку и top-K чанков из базы знаний.
- Генерации логируются в `GenerationLog`.
- Важные события пишутся в `ActivityEvent`.

### Стиль кода

- TypeScript: строгий режим Next.js. Избегай `any` в новом коде.
- Форматирование: используем двойные кавычки, 2 пробела отступа (как в проекте).
- Новые API-роуты: всегда проверяй `getCurrentUser()`, `requireMembership()`, права по роли.

## Скрипты

```bash
npm run dev          # запуск dev-сервера
npm run build        # prisma migrate deploy && next build
npm run start        # next start
npm run db:migrate   # prisma migrate dev
npm run db:generate  # prisma generate
npm run db:studio    # prisma studio
```

## Деплой

- Railway: подключить репозиторий, добавить плагин PostgreSQL, включить `pgvector`, задать env-переменные.
- Скрипт `build` автоматически применяет миграции.
