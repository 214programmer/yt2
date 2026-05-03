const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_ANALYZED_VIDEOS = 60;
const COMPETITOR_LOOKBACK_YEARS = 3;
const YOUTUBE_TIMEOUT_MS = 15000;

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "another",
  "before",
  "being",
  "between",
  "channel",
  "from",
  "have",
  "just",
  "more",
  "most",
  "that",
  "their",
  "them",
  "this",
  "those",
  "through",
  "using",
  "video",
  "with",
  "your",
  "youtube",
  "это",
  "этот",
  "чтобы",
  "когда",
  "после",
  "почему",
  "канал",
  "видео",
  "всем",
  "если",
  "если",
  "как",
  "или",
  "для",
  "про",
  "под",
  "над",
  "так",
  "тут",
  "где",
  "что",
  "кто",
  "без",
  "уже",
  "еще",
  "она",
  "они",
  "оно",
  "его",
  "ее",
  "все",
  "это",
  "the",
  "and",
  "for",
  "you",
  "are",
  "was",
  "were",
  "but",
  "not",
  "how",
  "why",
  "what",
  "when",
  "where",
  "into",
  "our",
  "out",
  "new",
  "can",
  "off",
  "get",
  "got",
  "too",
  "без",
  "или",
  "если",
]);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

async function youtubeFetch(endpoint, params) {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  const apiKey = requireEnv("YOUTUBE_API_KEY");

  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(YOUTUBE_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(`YouTube API request failed at ${endpoint}: ${error.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

function parseChannelInput(input) {
  const trimmed = String(input || "").trim();

  if (!trimmed) {
    throw new Error("Введите ссылку на YouTube-канал или handle.");
  }

  if (trimmed.startsWith("UC") && trimmed.length >= 20) {
    return { kind: "id", value: trimmed };
  }

  if (trimmed.startsWith("@")) {
    return { kind: "handle", value: trimmed.slice(1) };
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { kind: "query", value: trimmed };
  }

  const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (!host.includes("youtube.com")) {
    return { kind: "query", value: trimmed };
  }

  if (parts[0] === "channel" && parts[1]) {
    return { kind: "id", value: parts[1] };
  }

  if (parts[0] && parts[0].startsWith("@")) {
    return { kind: "handle", value: parts[0].slice(1) };
  }

  if ((parts[0] === "c" || parts[0] === "user") && parts[1]) {
    return { kind: "query", value: parts[1] };
  }

  return { kind: "query", value: trimmed };
}

async function resolveChannel(parsedInput) {
  if (parsedInput.kind === "id") {
    const data = await youtubeFetch("channels", {
      part: "snippet,statistics,brandingSettings,contentDetails,topicDetails",
      id: parsedInput.value,
      maxResults: 1,
    });

    return data.items?.[0] || null;
  }

  if (parsedInput.kind === "handle") {
    const data = await youtubeFetch("channels", {
      part: "snippet,statistics,brandingSettings,contentDetails,topicDetails",
      forHandle: parsedInput.value,
      maxResults: 1,
    });

    return data.items?.[0] || null;
  }

  const search = await youtubeFetch("search", {
    part: "snippet",
    type: "channel",
    q: parsedInput.value,
    maxResults: 1,
  });

  const channelId = search.items?.[0]?.snippet?.channelId;
  if (!channelId) {
    return null;
  }

  const data = await youtubeFetch("channels", {
    part: "snippet,statistics,brandingSettings,contentDetails,topicDetails",
    id: channelId,
    maxResults: 1,
  });

  return data.items?.[0] || null;
}

async function collectUploads(playlistId) {
  const ids = [];
  let nextPageToken = "";

  while (ids.length < MAX_ANALYZED_VIDEOS) {
    const data = await youtubeFetch("playlistItems", {
      part: "contentDetails,snippet",
      playlistId,
      maxResults: 50,
      pageToken: nextPageToken || undefined,
    });

    for (const item of data.items || []) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) {
        ids.push(videoId);
      }

      if (ids.length >= MAX_ANALYZED_VIDEOS) {
        break;
      }
    }

    if (!data.nextPageToken || ids.length >= MAX_ANALYZED_VIDEOS) {
      return {
        ids,
        isCapped: Boolean(data.nextPageToken),
      };
    }

    nextPageToken = data.nextPageToken;
  }

  return {
    ids,
    isCapped: true,
  };
}

function parseDurationToSeconds(duration = "") {
  const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) {
    return 0;
  }

  const [, hours = "0", minutes = "0", seconds = "0"] = matches;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function extractThumbnail(thumbnails = {}) {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    null
  );
}

function formatTopicCategories(topicDetails = {}) {
  const categories = topicDetails.topicCategories || [];
  return categories
    .map((url) => {
      const tail = url.split("/").pop();
      return decodeURIComponent(tail || "").replace(/_/g, " ");
    })
    .filter(Boolean);
}

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function calculatePostingCadenceDays(videos) {
  if (videos.length < 2) {
    return null;
  }

  const published = videos
    .map((video) => new Date(video.publishedAt).getTime())
    .filter(Boolean)
    .sort((a, b) => b - a);

  const gaps = [];
  for (let index = 0; index < published.length - 1; index += 1) {
    const gapMs = published[index] - published[index + 1];
    gaps.push(gapMs / (1000 * 60 * 60 * 24));
  }

  return Number(average(gaps).toFixed(1));
}

function extractKeywords(texts, limit = 8) {
  const counts = new Map();

  texts.forEach((text) => {
    String(text || "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word))
      .forEach((word) => {
        counts.set(word, (counts.get(word) || 0) + 1);
      });
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function buildVideoDataset(items) {
  const now = Date.now();

  return items.map((item) => {
    const viewCount = numberOrZero(item.statistics?.viewCount);
    const likeCount = numberOrZero(item.statistics?.likeCount);
    const commentCount = numberOrZero(item.statistics?.commentCount);
    const durationSeconds = parseDurationToSeconds(item.contentDetails?.duration);
    const publishedAt = item.snippet?.publishedAt;
    const publishedTs = publishedAt ? new Date(publishedAt).getTime() : now;
    const ageDays = Math.max((now - publishedTs) / (1000 * 60 * 60 * 24), 1);
    const viewsPerDay = viewCount / ageDays;
    const engagementRate = viewCount ? ((likeCount + commentCount) / viewCount) * 100 : 0;
    const title = item.snippet?.title || "Без названия";

    return {
      id: item.id,
      title,
      description: item.snippet?.description || "",
      publishedAt,
      channelId: item.snippet?.channelId,
      channelTitle: item.snippet?.channelTitle,
      thumbnail: extractThumbnail(item.snippet?.thumbnails),
      url: `https://www.youtube.com/watch?v=${item.id}`,
      durationSeconds,
      viewCount,
      likeCount,
      commentCount,
      ageDays: Number(ageDays.toFixed(1)),
      viewsPerDay: Math.round(viewsPerDay),
      engagementRate: Number(engagementRate.toFixed(2)),
      titleLength: title.length,
      hasNumberInTitle: /\d/.test(title),
      isQuestionTitle: /\?$/.test(title.trim()),
      isShort: durationSeconds > 0 && durationSeconds <= 61,
    };
  });
}

function summarizePerformance(channel, videos, isCapped) {
  const sortedByViews = [...videos].sort((left, right) => right.viewCount - left.viewCount);
  const sortedByVelocity = [...videos].sort((left, right) => right.viewsPerDay - left.viewsPerDay);
  const sortedByEngagement = [...videos].sort(
    (left, right) => right.engagementRate - left.engagementRate,
  );

  const viewValues = videos.map((video) => video.viewCount);
  const shortCount = videos.filter((video) => video.isShort).length;
  const averageTitleLength = average(videos.map((video) => video.titleLength));
  const questionsRatio = videos.length
    ? (videos.filter((video) => video.isQuestionTitle).length / videos.length) * 100
    : 0;
  const numberRatio = videos.length
    ? (videos.filter((video) => video.hasNumberInTitle).length / videos.length) * 100
    : 0;

  const keywordPool = extractKeywords([
    channel.title,
    channel.description,
    ...videos.map((video) => video.title),
  ]);

  return {
    coverage: {
      analyzedVideos: videos.length,
      totalPublicVideos: channel.videoCount,
      isCapped,
      maxVideos: MAX_ANALYZED_VIDEOS,
    },
    totals: {
      channelSubscribers: channel.subscriberCount,
      channelViews: channel.viewCount,
      analyzedViews: videos.reduce((sum, video) => sum + video.viewCount, 0),
    },
    averages: {
      views: Math.round(average(viewValues)),
      medianViews: Math.round(median(viewValues)),
      engagementRate: Number(average(videos.map((video) => video.engagementRate)).toFixed(2)),
      viewsPerDay: Math.round(average(videos.map((video) => video.viewsPerDay))),
      durationSeconds: Math.round(average(videos.map((video) => video.durationSeconds))),
      titleLength: Number(averageTitleLength.toFixed(1)),
      shortsShare: Number(((shortCount / Math.max(videos.length, 1)) * 100).toFixed(1)),
      questionTitleShare: Number(questionsRatio.toFixed(1)),
      numberTitleShare: Number(numberRatio.toFixed(1)),
      postingCadenceDays: calculatePostingCadenceDays(videos),
    },
    leaders: {
      topVideo: sortedByViews[0] || null,
      topVelocityVideo: sortedByVelocity[0] || null,
      topEngagementVideo: sortedByEngagement[0] || null,
      topFiveByViews: sortedByViews.slice(0, 5),
      weakestFiveByViews: [...sortedByViews].reverse().slice(0, 5),
    },
    topicFingerprint: {
      keywords: keywordPool,
      categories: channel.topics,
    },
  };
}

function buildCompetitorQueries(channel, stats) {
  const keywords = stats.topicFingerprint.keywords;
  const topVideoWords = extractKeywords([
    stats.leaders.topVideo?.title || "",
    stats.leaders.topVideo?.description || "",
  ]);

  const queries = [
    `${channel.title} ${keywords.slice(0, 3).join(" ")}`.trim(),
    keywords.slice(0, 4).join(" ").trim(),
    topVideoWords.slice(0, 4).join(" ").trim(),
  ].filter((query) => query.length >= 6);

  return [...new Set(queries)].slice(0, 3);
}

async function fetchVideosByIds(ids) {
  const chunks = [];
  for (let index = 0; index < ids.length; index += 50) {
    chunks.push(ids.slice(index, index + 50));
  }

  const results = [];
  for (const chunk of chunks) {
    const data = await youtubeFetch("videos", {
      part: "snippet,statistics,contentDetails",
      id: chunk.join(","),
      maxResults: 50,
    });

    results.push(...(data.items || []));
  }

  return results;
}

async function findCompetitorVideos(channel, stats) {
  const queries = buildCompetitorQueries(channel, stats);
  const collected = new Map();
  const publishedAfter = new Date();
  publishedAfter.setFullYear(publishedAfter.getFullYear() - COMPETITOR_LOOKBACK_YEARS);

  for (const query of queries) {
    const search = await youtubeFetch("search", {
      part: "snippet",
      type: "video",
      q: query,
      order: "viewCount",
      maxResults: 8,
      publishedAfter: publishedAfter.toISOString(),
    });

    for (const item of search.items || []) {
      const videoId = item.id?.videoId;
      if (!videoId || item.snippet?.channelId === channel.id) {
        continue;
      }

      if (!collected.has(videoId)) {
        collected.set(videoId, {
          query,
          searchSnippet: item.snippet,
        });
      }
    }
  }

  const videoIds = [...collected.keys()].slice(0, 20);
  const details = await fetchVideosByIds(videoIds);
  const dataset = buildVideoDataset(details)
    .map((video) => ({
      ...video,
      sourceQuery: collected.get(video.id)?.query || null,
    }))
    .filter((video) => video.channelId !== channel.id)
    .sort((left, right) => {
      const leftScore = left.viewsPerDay * 0.7 + left.engagementRate * 100;
      const rightScore = right.viewsPerDay * 0.7 + right.engagementRate * 100;
      return rightScore - leftScore;
    })
    .slice(0, 8);

  return {
    queries,
    videos: dataset,
  };
}

export async function buildYoutubeDataset(channelInput) {
  const parsedInput = parseChannelInput(channelInput);
  const rawChannel = await resolveChannel(parsedInput);

  if (!rawChannel) {
    throw new Error("Не удалось найти канал по этой ссылке. Проверьте URL или handle.");
  }

  const channel = {
    id: rawChannel.id,
    title: rawChannel.snippet?.title || "Без названия",
    description: rawChannel.snippet?.description || "",
    publishedAt: rawChannel.snippet?.publishedAt || null,
    customUrl: rawChannel.snippet?.customUrl || null,
    country: rawChannel.snippet?.country || null,
    thumbnail: extractThumbnail(rawChannel.snippet?.thumbnails),
    banner:
      rawChannel.brandingSettings?.image?.bannerExternalUrl ||
      rawChannel.brandingSettings?.image?.bannerMobileExtraHdImageUrl ||
      null,
    subscriberCount: numberOrZero(rawChannel.statistics?.subscriberCount),
    viewCount: numberOrZero(rawChannel.statistics?.viewCount),
    videoCount: numberOrZero(rawChannel.statistics?.videoCount),
    uploadsPlaylistId: rawChannel.contentDetails?.relatedPlaylists?.uploads,
    keywords: String(rawChannel.brandingSettings?.channel?.keywords || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 15),
    topics: formatTopicCategories(rawChannel.topicDetails),
  };

  if (!channel.uploadsPlaylistId) {
    throw new Error("У канала не удалось определить плейлист загрузок.");
  }

  const uploads = await collectUploads(channel.uploadsPlaylistId);
  const rawVideos = await fetchVideosByIds(uploads.ids);
  const videos = buildVideoDataset(rawVideos).sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  );

  const stats = summarizePerformance(channel, videos, uploads.isCapped);
  let competitors;
  try {
    competitors = await findCompetitorVideos(channel, stats);
  } catch (error) {
    competitors = {
      queries: buildCompetitorQueries(channel, stats),
      videos: [],
      error: error.message,
    };
  }

  return {
    channel,
    stats,
    videos,
    competitors,
  };
}
