import { VideoCreateInput } from "@/types/video";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_VIDEO_MODEL =
  process.env.OPENROUTER_VIDEO_MODEL || "kwaivgi/kling-v3.0-std";

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
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Prompt2Video Studio",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Erro ao criar vídeo.");
  }

  return data;
}

export async function getVideoStatus(pollingUrl: string) {
  assertApiKey();

  const response = await fetch(pollingUrl, {
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Prompt2Video Studio",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Erro ao consultar status.");
  }

  return data;
}
