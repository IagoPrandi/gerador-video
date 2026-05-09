import { VideoCreateInput } from "@/types/video";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_VIDEO_MODEL =
  process.env.OPENROUTER_VIDEO_MODEL?.trim() || "google/veo-3.1";

function assertApiKey() {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY não configurada. Crie um arquivo .env.local com sua chave."
    );
  }
}

export async function createVideoJob(input: VideoCreateInput) {
  assertApiKey();

  const payload: Record<string, unknown> = {
    model: OPENROUTER_VIDEO_MODEL,
    prompt: input.prompt,
    duration: input.duration ?? 5,
    resolution: input.resolution ?? "720p",
    aspect_ratio: input.aspect_ratio ?? "16:9",
    generate_audio: input.generate_audio ?? true,
  };

  if (input.references?.length) {
    payload.input_references = input.references.map((url) => ({
      type: "image_url",
      image_url: { url },
    }));
  }

  const response = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "Prompt2Video Studio",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Erro ao criar vídeo (${response.status}): ${data?.error?.message || data?.message || JSON.stringify(data)}`
    );
  }

  return {
    ...data,
    polling_url: typeof data?.polling_url === "string" && data.polling_url.startsWith("/")
      ? `https://openrouter.ai${data.polling_url}`
      : data.polling_url,
  };
}

function normalizePollingUrl(pollingUrl: string) {
  return pollingUrl.startsWith("/") ? `https://openrouter.ai${pollingUrl}` : pollingUrl;
}

export async function getVideoStatus(pollingUrl: string) {
  assertApiKey();

  const response = await fetch(normalizePollingUrl(pollingUrl), {
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "X-OpenRouter-Title": "Prompt2Video Studio",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Erro ao consultar status (${response.status}): ${data?.error?.message || data?.message || JSON.stringify(data)}`
    );
  }

  return data;
}
