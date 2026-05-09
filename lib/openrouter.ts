import { ScriptModelInfo, ScriptPlan, VideoModelInfo } from "@/types/video";
import { SCRIPT_AGENT_SKILL } from "@/lib/script-agent";

const API_BASE = "https://openrouter.ai/api/v1";

function getApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada no .env.local.");
  return key;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Gerador de Vídeo Longo"
  };
}

export async function listVideoModels(): Promise<VideoModelInfo[]> {
  const response = await fetch(`${API_BASE}/videos/models`, { headers: authHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.data || [];
}

export async function listScriptModels(): Promise<ScriptModelInfo[]> {
  const response = await fetch(`${API_BASE}/models`, { headers: authHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return (data.data || [])
    .filter((model: any) => {
      const modalities = model.architecture?.output_modalities || [];
      return modalities.includes("text") || !modalities.length;
    })
    .map((model: any) => ({ id: model.id, name: model.name || model.id, context_length: model.context_length }));
}

export async function createScriptPlan(input: {
  scriptModel: string;
  prompt: string;
  references: string[];
  targetDurationSeconds: number;
  maxSceneDurationSeconds: number;
  aspectRatio: string;
  resolution: string;
}): Promise<ScriptPlan> {
  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: input.scriptModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCRIPT_AGENT_SKILL },
        {
          role: "user",
          content: JSON.stringify({
            tarefa: "Criar roteiro técnico para vídeo longo gerado por cenas",
            prompt_inicial: input.prompt,
            referencias: input.references,
            duracao_total_desejada_segundos: input.targetDurationSeconds,
            duracao_maxima_por_cena_segundos: input.maxSceneDurationSeconds,
            aspect_ratio: input.aspectRatio,
            resolution: input.resolution,
            instrucao: "Retorne somente JSON válido no formato obrigatório."
          })
        }
      ]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Erro ao gerar roteiro.");
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("O modelo de roteiro não retornou conteúdo.");
  return JSON.parse(content);
}

export async function createVideoJob(input: {
  videoModel?: string;
  model?: string;
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  aspect_ratio?: string;
  resolution?: string;
  references?: string[];
  generate_audio?: boolean;
}) {
  const payload: Record<string, unknown> = {
    model: input.videoModel || input.model || process.env.DEFAULT_VIDEO_MODEL || process.env.OPENROUTER_VIDEO_MODEL,
    prompt: input.prompt,
    duration: input.duration ?? 5,
    aspect_ratio: input.aspectRatio || input.aspect_ratio || "16:9",
    resolution: input.resolution || "720p"
  };
  if (typeof input.generate_audio === "boolean") payload.generate_audio = input.generate_audio;
  if (input.references?.length) payload.input_references = input.references.map((url) => ({ image_url: url }));

  const response = await fetch(`${API_BASE}/videos`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Erro ao criar job de vídeo.");
  return data;
}

export async function pollVideoJob(pollingUrl: string) {
  const url = pollingUrl.startsWith("http") ? pollingUrl : `https://openrouter.ai${pollingUrl}`;
  const response = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Erro ao consultar job de vídeo.");
  return data;
}

export async function getVideoStatus(pollingUrl: string) {
  return pollVideoJob(pollingUrl);
}

export async function downloadVideo(url: string) {
  const finalUrl = url.startsWith("http") ? url : `https://openrouter.ai${url}`;
  const response = await fetch(finalUrl, { headers: authHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(`Erro ao baixar vídeo: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
