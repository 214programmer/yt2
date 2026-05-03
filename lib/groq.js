function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const AI_VIDEO_LIMIT = 12;
const AI_COMPETITOR_LIMIT = 3;
const MAX_COMPLETION_TOKENS = 2000;

const ANALYSIS_SCHEMA = {
  name: "youtube_channel_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
      },
      positioning: {
        type: "object",
        additionalProperties: false,
        properties: {
          niche: { type: "string" },
          targetAudience: { type: "string" },
          contentEngine: { type: "string" },
        },
        required: ["niche", "targetAudience", "contentEngine"],
      },
      channelAudit: {
        type: "object",
        additionalProperties: false,
        properties: {
          strengths: {
            type: "array",
            items: { type: "string" },
          },
          weaknesses: {
            type: "array",
            items: { type: "string" },
          },
          quickWins: {
            type: "array",
            items: { type: "string" },
          },
          strategicRisks: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["strengths", "weaknesses", "quickWins", "strategicRisks"],
      },
      contentPatterns: {
        type: "object",
        additionalProperties: false,
        properties: {
          winningFormats: {
            type: "array",
            items: { type: "string" },
          },
          underperformingPatterns: {
            type: "array",
            items: { type: "string" },
          },
          titleInsights: {
            type: "array",
            items: { type: "string" },
          },
          thumbnailInsights: {
            type: "array",
            items: { type: "string" },
          },
          cadenceInsights: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "winningFormats",
          "underperformingPatterns",
          "titleInsights",
          "thumbnailInsights",
          "cadenceInsights",
        ],
      },
      topVideoBreakdown: {
        type: "object",
        additionalProperties: false,
        properties: {
          videoId: { type: ["string", "null"] },
          title: { type: "string" },
          whyItWorked: {
            type: "array",
            items: { type: "string" },
          },
          replicableElements: {
            type: "array",
            items: { type: "string" },
          },
          cautionNotes: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["videoId", "title", "whyItWorked", "replicableElements", "cautionNotes"],
      },
      videoReviews: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            videoId: { type: "string" },
            title: { type: "string" },
            performanceLabel: { type: "string" },
            score: { type: "number" },
            outliers: {
              type: "array",
              items: { type: "string" },
            },
            opportunities: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "videoId",
            "title",
            "performanceLabel",
            "score",
            "outliers",
            "opportunities",
          ],
        },
      },
      competitorTakeaways: {
        type: "object",
        additionalProperties: false,
        properties: {
          overview: { type: "string" },
          videos: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                videoId: { type: "string" },
                title: { type: "string" },
                channelTitle: { type: "string" },
                url: { type: "string" },
                whyItPopped: {
                  type: "array",
                  items: { type: "string" },
                },
                ideasToAdapt: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "videoId",
                "title",
                "channelTitle",
                "url",
                "whyItPopped",
                "ideasToAdapt",
              ],
            },
          },
        },
        required: ["overview", "videos"],
      },
      actionPlan: {
        type: "object",
        additionalProperties: false,
        properties: {
          next7Days: {
            type: "array",
            items: { type: "string" },
          },
          next30Days: {
            type: "array",
            items: { type: "string" },
          },
          experimentIdeas: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["next7Days", "next30Days", "experimentIdeas"],
      },
    },
    required: [
      "summary",
      "positioning",
      "channelAudit",
      "contentPatterns",
      "topVideoBreakdown",
      "videoReviews",
      "competitorTakeaways",
      "actionPlan",
    ],
  },
};

function limitText(value, maxLength = 280) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function briefVideo(video) {
  if (!video) {
    return null;
  }

  return {
    id: video.id,
    title: limitText(video.title, 130),
    publishedAt: video.publishedAt,
    durationSeconds: video.durationSeconds,
    viewCount: video.viewCount,
    likeCount: video.likeCount,
    commentCount: video.commentCount,
    viewsPerDay: video.viewsPerDay,
    engagementRate: video.engagementRate,
    isShort: video.isShort,
    url: video.url,
  };
}

function uniqueVideos(videos) {
  const seen = new Set();
  const unique = [];

  for (const video of videos.filter(Boolean)) {
    if (seen.has(video.id)) {
      continue;
    }

    seen.add(video.id);
    unique.push(video);
  }

  return unique;
}

function pickVideosForAi(dataset) {
  return uniqueVideos([
    ...(dataset.stats.leaders.topFiveByViews || []),
    ...(dataset.stats.leaders.weakestFiveByViews || []),
    dataset.stats.leaders.topVelocityVideo,
    dataset.stats.leaders.topEngagementVideo,
    ...dataset.videos.slice(0, 8),
  ])
    .slice(0, AI_VIDEO_LIMIT)
    .map(briefVideo);
}

function withDefaultArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildLocalVideoReview(video, dataset) {
  const medianViews = dataset.stats.averages.medianViews || 0;
  const averageEngagement = dataset.stats.averages.engagementRate || 0;
  const averageVelocity = dataset.stats.averages.viewsPerDay || 0;
  const scoreParts = [
    medianViews ? Math.min((video.viewCount / medianViews) * 35, 45) : 20,
    averageVelocity ? Math.min((video.viewsPerDay / averageVelocity) * 30, 35) : 15,
    averageEngagement ? Math.min((video.engagementRate / averageEngagement) * 20, 20) : 10,
  ];
  const score = Math.max(1, Math.min(100, Math.round(scoreParts.reduce((sum, value) => sum + value, 0))));
  let performanceLabel = "середняк";

  if (video.viewCount >= medianViews * 1.6 || video.viewsPerDay >= averageVelocity * 1.6) {
    performanceLabel = "сильный ролик";
  } else if (video.viewCount < medianViews * 0.65 && video.viewsPerDay < averageVelocity * 0.75) {
    performanceLabel = "ниже среднего";
  }

  const outliers = [];
  if (video.viewsPerDay >= averageVelocity * 1.6) {
    outliers.push("скорость просмотров выше среднего по каналу");
  }
  if (video.engagementRate >= averageEngagement * 1.35) {
    outliers.push("вовлеченность выше средней");
  }
  if (video.isShort) {
    outliers.push("короткий формат");
  }
  if (!outliers.length) {
    outliers.push("метрики близки к среднему профилю канала");
  }

  const opportunities = [];
  if (video.title.length < 35) {
    opportunities.push("проверить более конкретный заголовок с ясным обещанием");
  }
  if (video.engagementRate < averageEngagement) {
    opportunities.push("усилить повод для комментариев и сохранений");
  }
  if (video.viewsPerDay < averageVelocity) {
    opportunities.push("пересобрать упаковку темы и протестировать похожий угол подачи");
  }
  if (!opportunities.length) {
    opportunities.push("использовать как референс для повторяемого формата");
  }

  return {
    videoId: video.id,
    title: video.title,
    performanceLabel,
    score,
    outliers,
    opportunities,
  };
}

function mergeVideoReviews(aiReviews, dataset) {
  const reviewsById = new Map();

  withDefaultArray(aiReviews).forEach((review) => {
    if (review?.videoId) {
      reviewsById.set(review.videoId, {
        videoId: review.videoId,
        title: review.title || dataset.videos.find((video) => video.id === review.videoId)?.title || "",
        performanceLabel: review.performanceLabel || "AI-разбор",
        score: Number(review.score || 0),
        outliers: withDefaultArray(review.outliers),
        opportunities: withDefaultArray(review.opportunities),
      });
    }
  });

  return dataset.videos.map((video) => {
    const fallback = buildLocalVideoReview(video, dataset);
    const aiReview = reviewsById.get(video.id);

    if (!aiReview) {
      return fallback;
    }

    return {
      ...fallback,
      ...aiReview,
      outliers: aiReview.outliers.length ? aiReview.outliers : fallback.outliers,
      opportunities: aiReview.opportunities.length ? aiReview.opportunities : fallback.opportunities,
    };
  });
}

function fallbackCompetitorVideos(analysis, dataset) {
  const aiVideos = withDefaultArray(analysis.competitorTakeaways?.videos);
  if (aiVideos.length) {
    return aiVideos;
  }

  return withDefaultArray(dataset.competitors.videos).slice(0, AI_COMPETITOR_LIMIT).map((video) => ({
    videoId: video.id,
    title: video.title,
    channelTitle: video.channelTitle || "Конкурентный канал",
    url: video.url,
    whyItPopped: [
      "ролик найден YouTube Search по близкой тематике и отсортирован по сильной динамике",
      "тема пересекается с контентным полем анализируемого канала",
    ],
    ideasToAdapt: [
      "сравнить формулировку темы и угол обещания в заголовке",
      "проверить похожий формат с собственной экспертизой канала",
    ],
  }));
}

function normalizeAnalysis(analysis, dataset) {
  const topVideo = dataset.stats.leaders.topVideo;

  return {
    summary: analysis.summary || "AI-анализ выполнен по доступным метрикам канала.",
    positioning: {
      niche: analysis.positioning?.niche || "Ниша определяется по метаданным канала.",
      targetAudience:
        analysis.positioning?.targetAudience || "Аудитория требует уточнения по контенту.",
      contentEngine:
        analysis.positioning?.contentEngine || "Контентная система оценена по частоте и темам.",
    },
    channelAudit: {
      strengths: withDefaultArray(analysis.channelAudit?.strengths),
      weaknesses: withDefaultArray(analysis.channelAudit?.weaknesses),
      quickWins: withDefaultArray(analysis.channelAudit?.quickWins),
      strategicRisks: withDefaultArray(analysis.channelAudit?.strategicRisks),
    },
    contentPatterns: {
      winningFormats: withDefaultArray(analysis.contentPatterns?.winningFormats),
      underperformingPatterns: withDefaultArray(analysis.contentPatterns?.underperformingPatterns),
      titleInsights: withDefaultArray(analysis.contentPatterns?.titleInsights),
      thumbnailInsights: withDefaultArray(analysis.contentPatterns?.thumbnailInsights),
      cadenceInsights: withDefaultArray(analysis.contentPatterns?.cadenceInsights),
    },
    topVideoBreakdown: {
      videoId: analysis.topVideoBreakdown?.videoId || topVideo?.id || null,
      title: analysis.topVideoBreakdown?.title || topVideo?.title || "Нет данных",
      whyItWorked: withDefaultArray(analysis.topVideoBreakdown?.whyItWorked),
      replicableElements: withDefaultArray(analysis.topVideoBreakdown?.replicableElements),
      cautionNotes: withDefaultArray(analysis.topVideoBreakdown?.cautionNotes),
    },
    videoReviews: mergeVideoReviews(analysis.videoReviews, dataset),
    competitorTakeaways: {
      overview:
        analysis.competitorTakeaways?.overview ||
        "Конкурентные выводы ограничены доступными видео и поисковыми результатами.",
      videos: fallbackCompetitorVideos(analysis, dataset),
    },
    actionPlan: {
      next7Days: withDefaultArray(analysis.actionPlan?.next7Days),
      next30Days: withDefaultArray(analysis.actionPlan?.next30Days),
      experimentIdeas: withDefaultArray(analysis.actionPlan?.experimentIdeas),
    },
  };
}

function buildHeuristicAnalysis(dataset) {
  const topVideo = dataset.stats.leaders.topVideo;
  const averages = dataset.stats.averages;

  return {
    summary: `Канал ${dataset.channel.title} проанализирован по ${dataset.stats.coverage.analyzedVideos} последним видео. AI-ответ был неполным, поэтому стратегический отчет собран по метрикам YouTube и локальным правилам.`,
    positioning: {
      niche: dataset.stats.topicFingerprint.keywords.slice(0, 4).join(", ") || "тематика канала",
      targetAudience: "аудитория определяется по повторяющимся темам, заголовкам и динамике просмотров",
      contentEngine: `средний интервал публикаций: ${averages.postingCadenceDays || "недостаточно данных"} дней`,
    },
    channelAudit: {
      strengths: [
        "есть измеримая база роликов для поиска повторяемых форматов",
        "топовые видео дают ориентир для тем и упаковки",
      ],
      weaknesses: [
        "часть роликов заметно уступает медиане просмотров",
        "нужно регулярнее сравнивать скорость просмотров и вовлеченность после публикации",
      ],
      quickWins: [
        "повторить темы и формулировки из роликов выше медианы",
        "пересобрать заголовки слабых роликов через более конкретное обещание",
      ],
      strategicRisks: [
        "слишком большой разброс результатов усложняет прогнозирование роста",
        "ставка только на единичные хиты может замедлить системный рост",
      ],
    },
    contentPatterns: {
      winningFormats: [
        "ориентироваться на ролики с высокой скоростью просмотров в день",
        "искать общие темы у топ-5 роликов по просмотрам",
      ],
      underperformingPatterns: [
        "ролики ниже медианы требуют проверки упаковки темы",
        "низкая вовлеченность указывает на слабый стимул к обсуждению",
      ],
      titleInsights: [
        "сравнить длину и конкретику заголовков у лидеров и аутсайдеров",
        "тестировать числа, контраст или ясный результат в названии",
      ],
      thumbnailInsights: [
        "по метаданным стоит проверять, насколько тема считывается до клика",
        "для слабых роликов полезен A/B-подход к упаковке",
      ],
      cadenceInsights: [
        "смотреть не только на частоту, но и на стабильность результата после публикации",
      ],
    },
    topVideoBreakdown: {
      videoId: topVideo?.id || null,
      title: topVideo?.title || "Нет данных",
      whyItWorked: [
        "ролик лидирует по просмотрам относительно остальных видео канала",
        "тема и упаковка, вероятно, попали в более широкий спрос аудитории",
      ],
      replicableElements: [
        "повторить близкий угол темы без копирования",
        "сделать серию из смежных вопросов вокруг этого ролика",
      ],
      cautionNotes: [
        "не переносить выводы без проверки на новых публикациях",
        "отделять влияние темы от влияния формата и времени публикации",
      ],
    },
    competitorTakeaways: {
      overview: "Конкурентные видео используются как ориентир для тем и упаковки.",
      videos: [],
    },
    actionPlan: {
      next7Days: [
        "выбрать 3 темы из лучших роликов и подготовить новые углы подачи",
        "обновить упаковку 2-3 слабых роликов",
      ],
      next30Days: [
        "запустить серию повторяемых форматов вокруг лучших тем",
        "вести таблицу скорости просмотров и вовлеченности по каждому ролику",
      ],
      experimentIdeas: [
        "тест заголовков с числом против заголовков с вопросом",
        "короткий ролик против длинного объяснения на одной теме",
      ],
    },
  };
}

function parseJsonContent(content) {
  const trimmed = String(content || "").trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const firstBrace = withoutFence.indexOf("{");
    const lastBrace = withoutFence.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Groq вернул ответ не в JSON-формате.");
    }

    return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1));
  }
}

function getGroqRetryDelayMs(errorText) {
  const match = errorText.match(/try again in ([\d.]+)s/i);
  if (!match) {
    return 8000;
  }

  return Math.ceil((Number(match[1]) + 0.5) * 1000);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizePlanDetails(value) {
  return {
    overview:
      value?.overview ||
      "Ниже рабочие действия: что сделать, какой артефакт получить и как проверить результат.",
    phases: withDefaultArray(value?.phases).map((phase) => ({
      title: phase?.title || "Этап",
      objective: phase?.objective || "Выполнить шаги этапа",
      steps: withDefaultArray(phase?.steps),
      deliverable: phase?.deliverable || "Промежуточный результат готов к проверке",
    })),
    checklist: withDefaultArray(value?.checklist),
    metricsToWatch: withDefaultArray(value?.metricsToWatch),
    prompts: withDefaultArray(value?.prompts),
  };
}

function buildHeuristicPlanDetails(payload) {
  const plan = payload.analysis?.actionPlan || {};
  const cadenceInsights = payload.analysis?.contentPatterns?.cadenceInsights || [];

  return normalizePlanDetails({
    overview:
      "Подробный план собран локально по рекомендациям из аудита. Его можно использовать как рабочую инструкцию на ближайший цикл.",
    phases: [
      {
        title: "Собрать доску задач",
        objective: "Превратить советы в список задач с результатом и сроком.",
        steps: [
          "Создайте таблицу с колонками: задача, ролик/тема, действие, дедлайн, метрика проверки.",
          "Перенесите каждый пункт из Следующие 7 дней в отдельную строку таблицы.",
          "Заполните колонку действие глаголом: переписать заголовок, снять ролик, обновить описание, подготовить 10 тем.",
          "Поставьте дедлайн на ближайшие 7 дней; задачи без дедлайна удалите или упростите.",
        ],
        deliverable: "Таблица задач, где у каждой строки есть действие, срок и метрика проверки.",
      },
      {
        title: "Собрать контентные гипотезы",
        objective: "Получить темы, которые можно проверить публикацией, а не обсуждением.",
        steps: [
          ...withDefaultArray(plan.next7Days).slice(0, 3),
          ...withDefaultArray(plan.experimentIdeas).slice(0, 2),
          "Для каждой темы напишите гипотезу формата: если сделать X, то метрика Y вырастет, потому что Z.",
          "Оставьте только гипотезы, которые можно проверить одним роликом или одной правкой упаковки.",
        ].filter(Boolean),
        deliverable: "Список из 3-5 гипотез в формате: действие, ожидаемая метрика, причина.",
      },
      {
        title: "Настроить контроль публикаций",
        objective: "Проверять каждый ролик одинаковыми метриками.",
        steps: [
          ...withDefaultArray(cadenceInsights).slice(0, 3),
          "Создайте строки для каждого нового ролика: 24 часа, 72 часа, 7 дней.",
          "В каждой строке фиксируйте просмотры, ER, views per day и отличие от медианы канала.",
          "Помечайте ролик сильным, если через 72 часа он выше медианы по views per day минимум на 30%.",
        ].filter(Boolean),
        deliverable: "Таблица контроля, где каждый ролик получает статус: слабый, средний или сильный.",
      },
      {
        title: "Закрыть месячный цикл",
        objective: "Оставить только то, что доказано метриками.",
        steps: [
          ...withDefaultArray(plan.next30Days).slice(0, 3),
          "В конце месяца отсортируйте ролики по views per day и ER.",
          "Повторите два формата выше медианы и остановите два формата ниже медианы.",
          "Запишите вывод в одну строку: формат, почему сработал/не сработал, что делать дальше.",
        ].filter(Boolean),
        deliverable: "План следующего месяца из проверенных форматов, а не общих идей.",
      },
    ],
    checklist: [
      "У каждой задачи есть глагол действия, срок и измеримый результат.",
      "Для каждого нового ролика записана одна гипотеза, а не набор догадок.",
      "Для слабых роликов подготовлены минимум 2 новых заголовка и 1 новая идея обложки.",
      "Для каждого ролика заполнены метрики 24 часа, 72 часа и 7 дней.",
      "Один эксперимент проверяет только одну переменную: тема, заголовок, формат или длина.",
    ],
    metricsToWatch: [
      "24h views: если ниже медианы, сначала проверяйте тему и заголовок.",
      "72h views per day: если выше медианы на 30%, делайте продолжение темы.",
      "ER: если ниже среднего, добавьте вопрос, конфликт или понятный повод для комментария.",
      "Retention proxy по комментариям: если обсуждений мало, усиливайте хук первых 5 секунд.",
    ],
    prompts: [
      "Дай 10 заголовков для темы [ТЕМА]: 3 с числом, 3 с конфликтом, 2 с вопросом, 2 с обещанием результата.",
      "Собери сценарий Shorts на 45 секунд: хук 0-3с, доказательство 4-25с, вывод 26-40с, CTA 41-45с.",
      "Для ролика [НАЗВАНИЕ] сформулируй одну гипотезу и метрику успеха через 72 часа.",
      "Перепиши упаковку слабого ролика [ССЫЛКА]: новый заголовок, идея обложки, первый кадр, причина изменения.",
    ],
  });
}

export async function runGroqPlanDetails(payload) {
  const apiKey = requireEnv("GROQ_API_KEY");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const compactPayload = {
    channel: {
      title: payload.channel?.title,
      subscriberCount: payload.channel?.subscriberCount,
      videoCount: payload.channel?.videoCount,
    },
    averages: payload.stats?.averages,
    topVideo: payload.stats?.leaders?.topVideo
      ? {
          title: payload.stats.leaders.topVideo.title,
          viewCount: payload.stats.leaders.topVideo.viewCount,
          engagementRate: payload.stats.leaders.topVideo.engagementRate,
        }
      : null,
    plan: {
      next7Days: payload.analysis?.actionPlan?.next7Days || [],
      next30Days: payload.analysis?.actionPlan?.next30Days || [],
      experimentIdeas: payload.analysis?.actionPlan?.experimentIdeas || [],
      cadenceInsights: payload.analysis?.contentPatterns?.cadenceInsights || [],
    },
  };

  const requestBody = JSON.stringify({
    model,
    temperature: 0.25,
    max_completion_tokens: 1400,
    messages: [
      {
        role: "system",
        content:
          "Ты YouTube growth strategist. Верни только валидный minified JSON. Все текстовые значения строго на русском языке.",
      },
      {
        role: "user",
        content: `Сделай подробную инструкцию по выполнению плана. Не пересказывай исходные советы. Верни JSON формы:
{"overview":"","phases":[{"title":"","objective":"","steps":[],"deliverable":""}],"checklist":[],"metricsToWatch":[],"prompts":[]}

Правила:
- phases: 3-5 этапов.
- Каждая строка должна быть инструментом: действие + артефакт + критерий проверки.
- Запрещены пустые формулировки: "улучшить", "проработать", "усилить" без конкретного способа.
- steps: конкретные действия в повелительном наклонении: создайте, перепишите, сравните, удалите, запишите.
- checklist: проверочные пункты вида "готово, если ...".
- metricsToWatch: метрика + порог/сигнал + действие при отклонении.
- prompts: готовые шаблоны с плейсхолдерами [ТЕМА], [РОЛИК], [МЕТРИКА].
- Не повторяй исходный план другими словами; превращай его в рабочую инструкцию.

Данные:
${JSON.stringify(compactPayload)}`,
      },
    ],
  });

  let response;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: requestBody,
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });

      if (response.status !== 429 || attempt === 1) {
        break;
      }

      const errorText = await response.text();
      await wait(getGroqRetryDelayMs(errorText));
    }
  } catch (error) {
    throw new Error(`Groq API request failed: ${error.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return {
      model,
      details: buildHeuristicPlanDetails(payload),
    };
  }

  let details;
  try {
    details = normalizePlanDetails(parseJsonContent(content));
  } catch {
    details = buildHeuristicPlanDetails(payload);
  }

  return {
    model,
    details,
  };
}

export async function verifyGroqAccess() {
  const apiKey = requireEnv("GROQ_API_KEY");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  let response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new Error(`Groq API preflight failed: ${error.message}`);
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Groq API отклонил ключ доступа. Проверьте GROQ_API_KEY в .env.local и убедитесь, что ключ активен в console.groq.com.",
    );
  }

  if (!response.ok) {
    throw new Error(data.error?.message || `Groq API preflight returned ${response.status}`);
  }

  const availableModels = data.data?.map((item) => item.id) || [];
  if (availableModels.length > 0 && !availableModels.includes(model)) {
    throw new Error(
      `Модель ${model} не найдена в вашем Groq-аккаунте. Укажите доступную модель в GROQ_MODEL.`,
    );
  }

  return true;
}

export async function runGroqChannelAnalysis(dataset) {
  const apiKey = requireEnv("GROQ_API_KEY");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  const videosForAi = pickVideosForAi(dataset);
  const compactPayload = {
    channel: {
      id: dataset.channel.id,
      title: dataset.channel.title,
      description: limitText(dataset.channel.description, 500),
      publishedAt: dataset.channel.publishedAt,
      subscriberCount: dataset.channel.subscriberCount,
      viewCount: dataset.channel.viewCount,
      videoCount: dataset.channel.videoCount,
      country: dataset.channel.country,
      keywords: dataset.channel.keywords,
      topics: dataset.channel.topics,
    },
    coverage: dataset.stats.coverage,
    averages: dataset.stats.averages,
    totals: dataset.stats.totals,
    topicFingerprint: dataset.stats.topicFingerprint,
    leaders: {
      topVideo: briefVideo(dataset.stats.leaders.topVideo),
      topVelocityVideo: briefVideo(dataset.stats.leaders.topVelocityVideo),
      topEngagementVideo: briefVideo(dataset.stats.leaders.topEngagementVideo),
      topFiveByViews: dataset.stats.leaders.topFiveByViews.map(briefVideo),
      weakestFiveByViews: dataset.stats.leaders.weakestFiveByViews.map(briefVideo),
    },
    videosForReview: videosForAi,
    competitors: {
      queries: dataset.competitors.queries || [],
      error: dataset.competitors.error || null,
      videos: (dataset.competitors.videos || []).slice(0, AI_COMPETITOR_LIMIT).map((video) => ({
        ...briefVideo(video),
        channelTitle: video.channelTitle,
        sourceQuery: video.sourceQuery,
      })),
    },
  };

  const requestBody = JSON.stringify({
    model,
    temperature: 0.2,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    messages: [
      {
        role: "system",
        content:
          "Ты senior YouTube strategist и data analyst. Верни только minified JSON без markdown, пояснений и текста вокруг. Все текстовые значения JSON строго на русском языке. Не выдумывай факты вне данных.",
      },
      {
        role: "user",
        content: `Верни JSON строго такой формы:
{
"summary": "2-3 предложения",
"positioning": {"niche": "", "targetAudience": "", "contentEngine": ""},
"channelAudit": {"strengths": [], "weaknesses": [], "quickWins": [], "strategicRisks": []},
"contentPatterns": {"winningFormats": [], "underperformingPatterns": [], "titleInsights": [], "thumbnailInsights": [], "cadenceInsights": []},
"topVideoBreakdown": {"videoId": "", "title": "", "whyItWorked": [], "replicableElements": [], "cautionNotes": []},
"competitorTakeaways": {"overview": "", "videos": []},
"actionPlan": {"next7Days": [], "next30Days": [], "experimentIdeas": []}
}

Правила:
- Все строки в JSON пиши только на русском языке.
- Не возвращай videoReviews: приложение посчитает их локально.
- В каждом массиве 1-3 коротких пункта.
- Весь JSON должен быть короче 1000 токенов.
- Объясни, почему topVideo стал популярным.
- Отдельно покажи преимущества и недочеты канала.
- competitorTakeaways.videos оставь пустым массивом; overview заполни кратко.
- Не пиши про thumbnails как про факт, если изображения не анализировались.

Данные:
${JSON.stringify(compactPayload)}`,
      },
    ],
  });

  let response;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: requestBody,
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });

      if (response.status !== 429 || attempt === 1) {
        break;
      }

      const errorText = await response.text();
      await wait(getGroqRetryDelayMs(errorText));
    }
  } catch (error) {
    throw new Error(`Groq API request failed: ${error.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Groq API отклонил ключ доступа. Проверьте GROQ_API_KEY в .env.local и убедитесь, что ключ активен в console.groq.com.",
      );
    }

    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq не вернул содержимое анализа.");
  }

  let parsedAnalysis;
  try {
    parsedAnalysis = parseJsonContent(content);
  } catch {
    parsedAnalysis = buildHeuristicAnalysis(dataset);
  }

  return {
    model,
    analysis: normalizeAnalysis(parsedAnalysis, dataset),
  };
}
