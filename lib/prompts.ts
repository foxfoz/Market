import { Company, Channel, RoadmapTask, MediaFile } from "@prisma/client";

export function buildCompanyContext(
  company: Company,
  channels: Channel[],
  completedTasks: RoadmapTask[],
  mediaFiles: MediaFile[],
  knowledgeChunks: { content: string }[] = []
) {
  return `
Компания: ${company.name}
Сфера: ${company.industry}
Город: ${company.city || "не указан"}
Описание: ${company.description || "не указано"}
Услуги: ${company.services || "не указаны"}
УТП: ${company.usp || "не указано"}
Аудитория: ${company.audience || "не указана"}
Конкуренты: ${company.competitors || "не указаны"}
Каналы:
${channels.map((c) => `- ${c.name}${c.url ? ": " + c.url : ""}`).join("\n") || "не указаны"}
Цели: ${(company.goals as string[] | null)?.join(", ") || "не указаны"}

Выполненные задачи:
${completedTasks.map((t) => `- ${t.title}`).join("\n") || "пока нет"}

Медиатека:
${mediaFiles.map((f) => `- ${f.name} (${f.mimeType || "файл"})`).join("\n") || "пока не подключена"}

Релевантные материалы из базы знаний:
${knowledgeChunks.map((c) => `- ${c.content.slice(0, 500)}`).join("\n") || "нет материалов"}
`.trim();
}

export function systemPrompt(context: string) {
  return `Ты — senior-маркетолог и SMM-стратег. Твоя задача — помочь малому бизнесу развивать маркетинг максимально конкретно и применимо.

Контекст компании:
${context}

Правила:
- Отвечай конкретно и применимо, без воды.
- Каждая рекомендация = действие («создай визитку на ПроДокторов для врача X»).
- Пиши на русском, тон — экспертный, но живой.
- Если данных не хватает — задай 1–2 уточняющих вопроса.
- Учитывай медиатеку: если есть фото — предлагай, какие использовать; если нет — говори, что нужно доснять.
- Опирайся на базу знаний компании, если она дана.`;
}

export function auditPrompt(context: string) {
  return `${systemPrompt(context)}

Проведи первичный маркетинговый аудит по введённым данным. Верни результат в JSON-формате:
{
  "summary": "краткий снимок состояния (2-3 предложения)",
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "weaknesses": ["слабая сторона 1", "слабая сторона 2"],
  "recommendations": ["конкретная рекомендация 1", "конкретная рекомендация 2"]
}`;
}

export function roadmapPrompt(context: string) {
  return `${systemPrompt(context)}

Построй дорожную карту из маркетинговых задач. Верни JSON-массив:
[
  {
    "category": "Присутствие|Контент|Репутация|Реклама|Аналитика",
    "title": "название задачи",
    "reason": "обоснование, зачем делать",
    "priority": "red|yellow|green",
    "sortOrder": 0
  }
]

Требования:
- 8-15 задач.
- Каждая задача — конкретное действие.
- Приоритет red = срочно и важно, yellow = важно, green = оптимизация.
- Учитывай каналы компании: если чего-то нет — предложи создать.`;
}

export function contentPlanPrompt(context: string, days: number, channels: string[]) {
  return `${systemPrompt(context)}

Составь контент-план на ${days} дней для каналов: ${channels.join(", ")}.
Верни JSON-массив:
[
  {
    "date": "YYYY-MM-DD",
    "channel": "название канала",
    "format": "post|stories|reels|article",
    "topic": "тема",
    "goal": "reach|trust|sale",
    "rubric": "название рубрики"
  }
]

Требования:
- Каждый день — 1-2 публикации.
- Рубрики придумай под сферу бизнеса.
- Разнообразь форматы и цели.
- Даты начинай с сегодняшнего дня.`;
}

export function postPrompt(context: string, topic: string, channel: string, format?: string) {
  return `${systemPrompt(context)}

Напиши готовый пост для канала "${channel}" на тему "${topic}"${format ? `, формат: ${format}` : ""}.
Верни JSON:
{
  "text": "полный текст поста с хуком, основной частью и CTA",
  "visualHint": "какое фото/видео приложить или что снять",
  "hashtags": "#хэштеги"
}`;
}

export function refinePostPrompt(originalText: string, mode: string) {
  return `Перепиши следующий пост, применив режим "${mode}".
Режимы:
- shorter: сделай короче и лаконичнее
- emotional: сделай эмоциональнее, затронь чувства
- expert: добавь экспертности, цифр, фактов

Исходный пост:
${originalText}

Верни JSON: { "text": "новый текст поста" }`;
}

export function ideasPrompt(context: string, request: string) {
  return `${systemPrompt(context)}

Пользователь просит: "${request}".
Придумай 10 конкретных идей или сценариев съёмок с учётом специфики бизнеса, целей и медиатеки.
Верни JSON: { "ideas": ["идея 1", "идея 2", ...] }`;
}
