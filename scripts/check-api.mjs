import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\n/)) {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing ${name}`);
  }

  return process.env[name];
}

async function checkYoutube() {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("forHandle", "MrBeast");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", requireEnv("YOUTUBE_API_KEY"));

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `YouTube API returned ${response.status}`);
  }

  const channel = data.items?.[0];
  if (!channel) {
    throw new Error("YouTube API returned no channel data");
  }

  return {
    title: channel.snippet.title,
    subscribers: channel.statistics.subscriberCount,
    videos: channel.statistics.videoCount,
  };
}

async function checkGroqModels() {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${requireEnv("GROQ_API_KEY")}`,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || `Groq models endpoint returned ${response.status}`);
  }

  return data.data?.map((model) => model.id).slice(0, 8) || [];
}

async function checkGroqStructuredOutput() {
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("GROQ_API_KEY")}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: "Return a short Russian API test success message.",
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "api_check",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              ok: { type: "boolean" },
              message: { type: "string" },
            },
            required: ["ok", "message"],
          },
        },
      },
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || `Groq chat endpoint returned ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned no message content");
  }

  return {
    model,
    content: JSON.parse(content),
  };
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const youtube = await checkYoutube();
  console.log("YouTube API: OK");
  console.log(`Channel sample: ${youtube.title}, videos: ${youtube.videos}`);

  const models = await checkGroqModels();
  console.log("Groq models endpoint: OK");
  console.log(`Available model sample: ${models.join(", ") || "none returned"}`);

  const groq = await checkGroqStructuredOutput();
  console.log("Groq structured chat: OK");
  console.log(`Model tested: ${groq.model}`);
  console.log(`Message: ${groq.content.message}`);
}

main().catch((error) => {
  console.error(`API check failed: ${error.message}`);
  process.exit(1);
});
