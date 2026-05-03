"use client";

import { useState } from "react";

const EXAMPLES = [
  "https://www.youtube.com/@MrBeast",
  "https://www.youtube.com/@aliabdaal",
  "https://www.youtube.com/@вдудь",
];

const numberFormatter = new Intl.NumberFormat("ru-RU");

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) {
    return "Нет даты";
  }

  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds) {
  const safe = Number(seconds || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }

  return `${minutes}м ${secs}с`;
}

function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function BulletList({ title, items }) {
  return (
    <div className="list-card">
      <h3>{title}</h3>
      <ul>
        {(items || []).map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const [channelUrl, setChannelUrl] = useState(EXAMPLES[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planDetails, setPlanDetails] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // --- Переменные для Title Lab ---
  const [testTitle, setTestTitle] = useState("");
  const [titleResult, setTitleResult] = useState(null);
  const [titleLoading, setTitleLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const accessCode = window.prompt("Введите код доступа от администратора");
    if (!accessCode) {
      setError("Для запуска анализа нужен код доступа.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setPlanDetails(null);
    setPlanError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelUrl,
          accessCode,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось выполнить анализ.");
      }

      setResult(payload);
    } catch (submitError) {
      setError(submitError.message || "Ошибка во время запроса.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanDetails() {
    if (!result) {
      return;
    }

    setPlanLoading(true);
    setPlanError("");

    try {
      const response = await fetch("/api/plan-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: result.channel,
          stats: result.stats,
          analysis: {
            actionPlan: result.analysis.actionPlan,
            contentPatterns: {
              cadenceInsights: result.analysis.contentPatterns.cadenceInsights,
            },
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось подробно раскрыть план.");
      }

      setPlanDetails(payload);
    } catch (detailsError) {
      setPlanError(detailsError.message || "Ошибка во время детализации плана.");
    } finally {
      setPlanLoading(false);
    }
  }

  // --- Функция для Title Lab ---
  async function handleCheckTitle(e) {
    e.preventDefault();
    if (!testTitle) return;
    setTitleLoading(true);
    setTitleResult(null);
    try {
      const res = await fetch("/api/check-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: testTitle }),
      });
      const data = await res.json();
      if (res.ok) setTitleResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setTitleLoading(false);
    }
  }

  const coverage = result?.stats?.coverage;
  const topVideo = result?.stats?.leaders?.topVideo;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-pill">Vercel-ready • YouTube API • Groq AI</span>
          <h1>Channel Scope</h1>
          <p>
            Вставьте ссылку на YouTube-канал и получите глубокий AI-аудит:
            разбор всех доступных видео, причины успеха топ-ролика, сильные
            и слабые стороны, советы и подборку конкурентных видео по теме.
          </p>
          <div className="hero-tags">
            <span>Аналитика канала</span>
            <span>Разбор роликов</span>
            <span>Советы по росту</span>
            <span>Конкурентная разведка</span>
          </div>
        </div>

        <form className="hero-form" onSubmit={handleSubmit}>
          <label htmlFor="channelUrl">Ссылка на канал</label>
          <input
            id="channelUrl"
            type="text"
            value={channelUrl}
            onChange={(event) => setChannelUrl(event.target.value)}
            placeholder="https://www.youtube.com/@channel"
          />

          <div className="example-row">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="ghost-chip"
                onClick={() => setChannelUrl(example)}
              >
                {example.replace("https://www.youtube.com/", "")}
              </button>
            ))}
          </div>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Собираю аналитику..." : "Запустить анализ"}
          </button>

          <p className="form-note">
            Анализ использует `YouTube Data API` для метрик и `Groq` для
            интерпретации, выводов и рекомендаций.
          </p>
        </form>
      </section>

      {error ? <div className="status-banner error">{error}</div> : null}
      {loading ? (
        <div className="status-banner">
          Идет сбор данных канала, видео и конкурентных роликов. Затем они
          отправятся в Groq для итогового аудита.
        </div>
      ) : null}

      {result ? (
        <>
          <section
            className="channel-header"
            style={
              result.channel.banner
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.96)), url(${result.channel.banner})`,
                  }
                : undefined
            }
          >
            <div className="channel-meta">
              {result.channel.thumbnail ? (
                <img
                  className="channel-avatar"
                  src={result.channel.thumbnail}
                  alt={result.channel.title}
                />
              ) : null}
              <div>
                <span className="eyebrow">Канал</span>
                <h2>{result.channel.title}</h2>
                <p>{result.analysis.summary}</p>
                <div className="hero-tags">
                  {(result.stats.topicFingerprint.keywords || []).slice(0, 6).map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="model-badge">
              Модель Groq: <strong>{result.groqModel}</strong>
            </div>
          </section>

          <section className="metrics-grid">
            <MetricCard
              label="Подписчики"
              value={formatNumber(result.channel.subscriberCount)}
              hint="Общее число подписчиков канала"
            />
            <MetricCard
              label="Просмотры канала"
              value={formatNumber(result.channel.viewCount)}
              hint="Суммарные просмотры по каналу"
            />
            <MetricCard
              label="Видео в анализе"
              value={formatNumber(coverage.analyzedVideos)}
              hint={
                coverage.isCapped
                  ? `Показаны ${coverage.maxVideos} последних из ${coverage.totalPublicVideos}`
                  : `Проанализировано ${coverage.totalPublicVideos} видео`
              }
            />
            <MetricCard
              label="Средние просмотры"
              value={formatNumber(result.stats.averages.views)}
              hint="Среднее по выбранному набору видео"
            />
            <MetricCard
              label="Средний ER"
              value={formatPercent(result.stats.averages.engagementRate)}
              hint="(лайки + комментарии) / просмотры"
            />
            <MetricCard
              label="Частота публикаций"
              value={
                result.stats.averages.postingCadenceDays
                  ? `${result.stats.averages.postingCadenceDays} дн.`
                  : "Недостаточно данных"
              }
              hint="Средний интервал между роликами"
            />
          </section>

          <section className="two-column">
            <div className="panel">
              <span className="eyebrow">Позиционирование</span>
              <h3>{result.analysis.positioning.niche}</h3>
              <p>{result.analysis.positioning.targetAudience}</p>
              <p className="muted">{result.analysis.positioning.contentEngine}</p>
            </div>
            <div className="panel">
              <span className="eyebrow">Что видно по цифрам</span>
              <div className="stat-lines">
                <div>
                  <span>Медиана просмотров</span>
                  <strong>{formatNumber(result.stats.averages.medianViews)}</strong>
                </div>
                <div>
                  <span>Средняя скорость</span>
                  <strong>{formatNumber(result.stats.averages.viewsPerDay)} / день</strong>
                </div>
                <div>
                  <span>Средняя длина ролика</span>
                  <strong>{formatDuration(result.stats.averages.durationSeconds)}</strong>
                </div>
                <div>
                  <span>Доля Shorts</span>
                  <strong>{formatPercent(result.stats.averages.shortsShare)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="list-grid">
            <BulletList title="Преимущества" items={result.analysis.channelAudit.strengths} />
            <BulletList title="Недочеты" items={result.analysis.channelAudit.weaknesses} />
            <BulletList title="Быстрые улучшения" items={result.analysis.channelAudit.quickWins} />
            <BulletList title="Стратегические риски" items={result.analysis.channelAudit.strategicRisks} />
          </section>

          <section className="list-grid">
            <BulletList title="Форматы, которые работают" items={result.analysis.contentPatterns.winningFormats} />
            <BulletList
              title="Паттерны, которые тянут вниз"
              items={result.analysis.contentPatterns.underperformingPatterns}
            />
            <BulletList title="Что видно по заголовкам" items={result.analysis.contentPatterns.titleInsights} />
            <BulletList title="Что видно по подаче" items={result.analysis.contentPatterns.thumbnailInsights} />
          </section>

          {topVideo ? (
            <section className="spotlight">
              <div className="spotlight-main">
                <span className="eyebrow">Самое популярное видео</span>
                <h3>{topVideo.title}</h3>
                <div className="hero-tags">
                  <span>{formatNumber(topVideo.viewCount)} просмотров</span>
                  <span>{formatPercent(topVideo.engagementRate)} ER</span>
                  <span>{formatNumber(topVideo.viewsPerDay)} / день</span>
                  <span>{formatDate(topVideo.publishedAt)}</span>
                </div>
                <a className="inline-link" href={topVideo.url} target="_blank" rel="noreferrer">
                  Открыть видео на YouTube
                </a>
              </div>
              <div className="spotlight-grid">
                <BulletList
                  title="Почему ролик выстрелил"
                  items={result.analysis.topVideoBreakdown.whyItWorked}
                />
                <BulletList
                  title="Что можно повторить"
                  items={result.analysis.topVideoBreakdown.replicableElements}
                />
                <BulletList
                  title="С чем быть осторожнее"
                  items={result.analysis.topVideoBreakdown.cautionNotes}
                />
              </div>
            </section>
          ) : null}

          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">Конкуренты и референсы</span>
                <h3>Видео по теме, которые залетели</h3>
              </div>
              <p className="muted">{result.analysis.competitorTakeaways.overview}</p>
            </div>
            <div className="competitor-grid">
              {result.analysis.competitorTakeaways.videos.map((video) => (
                <article key={video.videoId} className="competitor-card">
                  <h4>{video.title}</h4>
                  <p className="muted">{video.channelTitle}</p>
                  <a className="inline-link" href={video.url} target="_blank" rel="noreferrer">
                    Открыть видео
                  </a>
                  <strong>Почему залетело</strong>
                  <ul>
                    {video.whyItPopped.map((item) => (
                      <li key={`${video.videoId}-why-${item}`}>{item}</li>
                    ))}
                  </ul>
                  <strong>Что адаптировать</strong>
                  <ul>
                    {video.ideasToAdapt.map((item) => (
                      <li key={`${video.videoId}-idea-${item}`}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">План роста</span>
                <h3>Что делать дальше</h3>
              </div>
              <p className="muted">
                Канал был проанализирован {formatDate(result.analyzedAt)}. Ниже
                готовый tactical roadmap, собранный AI по метрикам канала.
              </p>
            </div>
            <div className="list-grid plan-grid">
              <BulletList title="Следующие 7 дней" items={result.analysis.actionPlan.next7Days} />
              <BulletList title="Следующие 30 дней" items={result.analysis.actionPlan.next30Days} />
              <BulletList title="Эксперименты" items={result.analysis.actionPlan.experimentIdeas} />
              <BulletList title="Инсайты по ритму публикаций" items={result.analysis.contentPatterns.cadenceInsights} />
            </div>
            <div className="plan-actions">
              <button className="secondary-button" type="button" onClick={handlePlanDetails} disabled={planLoading}>
                {planLoading
                  ? "Генерирую подробности..."
                  : planDetails
                    ? "Повторить генерацию"
                    : "Узнать подробнее"}
              </button>
              {planDetails ? (
                <span className="muted">Подробный план обновлен {formatDate(planDetails.generatedAt)}</span>
              ) : null}
            </div>

            {planError ? <div className="status-banner error compact">{planError}</div> : null}

            {planDetails ? (
              <div className="details-panel">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Инструкция</span>
                    <h3>Как выполнить план шаг за шагом</h3>
                  </div>
                  <p className="muted">{planDetails.details.overview}</p>
                </div>

                <div className="phase-list">
                  {planDetails.details.phases.map((phase, index) => (
                    <article className="phase-card" key={`${phase.title}-${index}`}>
                      <span className="phase-number">{index + 1}</span>
                      <h4>{phase.title}</h4>
                      <p>{phase.objective}</p>
                      <ol>
                        {phase.steps.map((step) => (
                          <li key={`${phase.title}-${step}`}>{step}</li>
                        ))}
                      </ol>
                      <strong>Результат: {phase.deliverable}</strong>
                    </article>
                  ))}
                </div>

                <div className="details-grid">
                  <BulletList title="Чеклист выполнения" items={planDetails.details.checklist} />
                  <BulletList title="Метрики для контроля" items={planDetails.details.metricsToWatch} />
                  <BulletList title="Готовые промпты" items={planDetails.details.prompts} />
                </div>
              </div>
            ) : null}
          </section>

          <section className="panel">
            <div className="section-head">
              <div>
                <span className="eyebrow">Аудит всех видео</span>
                <h3>Подробная разбивка по роликам</h3>
              </div>
              <p className="muted">
                {coverage.isCapped
                  ? `Показаны последние ${coverage.maxVideos} видео из ${coverage.totalPublicVideos}.`
                  : "Показаны все найденные публичные видео канала."}
              </p>
            </div>

            <div className="table-wrap">
              <table className="videos-table">
                <thead>
                  <tr>
                    <th>Видео</th>
                    <th>Дата</th>
                    <th>Просмотры</th>
                    <th>ER</th>
                    <th>Скорость</th>
                    <th>Формат</th>
                  </tr>
                </thead>
                <tbody>
                  {result.videos.map((video) => {
                    const review = result.analysis.videoReviews.find(
                      (item) => item.videoId === video.id,
                    );

                    return (
                      <tr key={video.id}>
                        <td>
                          <a href={video.url} target="_blank" rel="noreferrer">
                            {video.title}
                          </a>
                          {review ? (
                            <div className="row-note">
                              {review.performanceLabel}: {review.opportunities[0]}
                            </div>
                          ) : null}
                        </td>
                        <td>{formatDate(video.publishedAt)}</td>
                        <td>{formatNumber(video.viewCount)}</td>
                        <td>{formatPercent(video.engagementRate)}</td>
                        <td>{formatNumber(video.viewsPerDay)}/день</td>
                        <td>{video.isShort ? "Shorts" : formatDuration(video.durationSeconds)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {/* --- БЛОК TITLE LAB (НОВОЕ) --- */}
      <section className="panel" style={{ marginTop: '40px', border: '2px solid #ff7a50' }}>
        <div className="section-head">
          <div>
            <span className="eyebrow" style={{ color: '#ff7a50' }}>Инструмент</span>
            <h3>Title Lab — Симулятор заголовка</h3>
          </div>
          <p className="muted">Проверь свой заголовок на кликабельность и получи советы от AI перед публикацией.</p>
        </div>

        <form onSubmit={handleCheckTitle} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            style={{ 
              flex: 1, 
              padding: '12px', 
              borderRadius: '8px', 
              border: '1px solid #ddd',
              color: '#333' 
            }}
            placeholder="Введите ваш вариант заголовка..."
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
          />
          <button className="primary-button" type="submit" disabled={titleLoading} style={{ margin: 0 }}>
            {titleLoading ? "Анализ..." : "Оценить"}
          </button>
        </form>

        {titleResult && (
          <div className="details-panel" style={{ display: 'block', background: '#fff', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', padding: '10px' }}>
              <div style={{ 
                fontSize: '48px', 
                fontWeight: 'bold', 
                color: titleResult.score > 70 ? '#22c55e' : '#f59e0b',
                minWidth: '100px'
              }}>
                {titleResult.score}%
              </div>
              <p style={{ color: '#333' }}><strong>Вердикт:</strong> {titleResult.analysis}</p>
            </div>
            
            <div className="list-grid">
              <BulletList title="Плюсы" items={titleResult.pros} />
              <BulletList title="Что плохо" items={titleResult.cons} />
              <BulletList title="AI рекомендует варианты" items={titleResult.improvements} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
