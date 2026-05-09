"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { AspectRatio, Resolution } from "@/types/video";

type JobState = {
  id?: string;
  status?: string;
  polling_url?: string;
  unsigned_urls?: string[];
  error?: string | null;
};

type LocalReference = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_LOCAL_REFERENCES = 6;
const MAX_REFERENCE_IMAGE_SIZE = 8 * 1024 * 1024;

function parseReferences(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Nao foi possivel ler a imagem selecionada."));
    };
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [prompt, setPrompt] = useState(
    "Um carro futurista atravessando uma cidade neon à noite, câmera baixa, chuva fina, reflexos no asfalto, estilo cinematográfico."
  );
  const [referencesText, setReferencesText] = useState("");
  const [localReferences, setLocalReferences] = useState<LocalReference[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState<Resolution>("720p");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [autoPoll, setAutoPoll] = useState(true);
  const [job, setJob] = useState<JobState | null>(null);
  const [error, setError] = useState("");

  const videoUrl = useMemo(() => job?.unsigned_urls?.[0] || "", [job]);
  const isRunning = job?.status === "pending" || job?.status === "processing";
  const references = useMemo(
    () => [
      ...parseReferences(referencesText),
      ...localReferences.map((reference) => reference.dataUrl),
    ],
    [localReferences, referencesText]
  );

  async function addLocalReferences(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);

    if (!files.length) return;

    setError("");
    setLoadingReferences(true);

    try {
      const remainingSlots = MAX_LOCAL_REFERENCES - localReferences.length;

      if (remainingSlots <= 0) {
        throw new Error(
          `Remova uma imagem antes de adicionar outra. Limite: ${MAX_LOCAL_REFERENCES}.`
        );
      }

      const selectedFiles = files.slice(0, remainingSlots);

      if (files.length > remainingSlots) {
        setError(
          `Foram adicionadas apenas ${remainingSlots} imagens. Limite: ${MAX_LOCAL_REFERENCES}.`
        );
      }

      const referencesFromFiles = await Promise.all(
        selectedFiles.map(async (file, index) => {
          if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
            throw new Error(`Formato nao suportado: ${file.name}. Use PNG, JPG, WebP ou GIF.`);
          }

          if (file.size > MAX_REFERENCE_IMAGE_SIZE) {
            throw new Error(
              `${file.name} tem ${formatBytes(file.size)}. O limite por imagem e ${formatBytes(
                MAX_REFERENCE_IMAGE_SIZE
              )}.`
            );
          }

          const dataUrl = await readFileAsDataUrl(file);

          return {
            id: `${file.name}-${file.lastModified}-${index}-${Date.now()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
          };
        })
      );

      setLocalReferences((current) => [...current, ...referencesFromFiles]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ler imagens locais.");
    } finally {
      input.value = "";
      setLoadingReferences(false);
    }
  }

  function removeLocalReference(id: string) {
    setLocalReferences((current) => current.filter((reference) => reference.id !== id));
  }

  async function createVideo() {
    setError("");
    setLoading(true);
    setJob(null);

    try {
      const response = await fetch("/api/videos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          references,
          duration,
          resolution,
          aspect_ratio: aspectRatio,
          generate_audio: generateAudio,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar vídeo.");
      }

      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    if (!job?.polling_url) return;

    setError("");
    setChecking(true);

    try {
      const response = await fetch("/api/videos/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polling_url: job.polling_url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao consultar status.");
      }

      setJob((current) => ({ ...current, ...data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!autoPoll || !isRunning || !job?.polling_url) return;

    const interval = window.setInterval(() => {
      checkStatus();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [autoPoll, isRunning, job?.polling_url]);

  return (
    <main className="min-h-screen px-4 py-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
          <p className="mb-2 text-sm font-medium text-gray-500">OpenRouter + Next.js</p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-950">
            Prompt2Video Studio
          </h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Gere videos a partir de um prompt, URLs e imagens locais de referencia. A chave da API fica somente no seu arquivo local <code className="rounded bg-gray-100 px-1">.env.local</code>.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <label className="block text-sm font-semibold text-gray-800">Prompt do vídeo</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="mt-2 min-h-44 w-full rounded-2xl border border-gray-200 p-4 outline-none focus:border-gray-500"
              placeholder="Descreva o vídeo que quer gerar..."
            />

            <label className="mt-5 block text-sm font-semibold text-gray-800">
              URLs de imagens de referência, uma por linha
            </label>
            <textarea
              value={referencesText}
              onChange={(event) => setReferencesText(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-gray-200 p-4 outline-none focus:border-gray-500"
              placeholder="https://exemplo.com/referencia.png"
            />

            <div className="mt-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-800">
                    Imagens locais de referencia
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, WebP ou GIF. Ate {MAX_LOCAL_REFERENCES} arquivos, {formatBytes(MAX_REFERENCE_IMAGE_SIZE)} por imagem.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 has-disabled:cursor-not-allowed has-disabled:opacity-50">
                  {loadingReferences ? "Lendo imagens..." : "Adicionar imagens"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    onChange={addLocalReferences}
                    disabled={loadingReferences || localReferences.length >= MAX_LOCAL_REFERENCES}
                    className="sr-only"
                  />
                </label>
              </div>

              {localReferences.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {localReferences.map((reference) => (
                    <div
                      key={reference.id}
                      className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-gray-200 p-2"
                    >
                      <img
                        src={reference.dataUrl}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {reference.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatBytes(reference.size)} - {reference.type.replace("image/", "").toUpperCase()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLocalReference(reference.id)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        aria-label={`Remover ${reference.name}`}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-gray-800">Duração</label>
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-gray-200 p-3"
                >
                  <option value={2}>2 segundos</option>
                  <option value={15}>15 segundos</option>
                  <option value={30}>30 segundos</option>
                  <option value={60}>60 segundos</option>
                  <option value={120}>120 segundos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">Resolução</label>
                <select
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value as Resolution)}
                  className="mt-2 w-full rounded-xl border border-gray-200 p-3"
                >
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">Formato</label>
                <select
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value as AspectRatio)}
                  className="mt-2 w-full rounded-xl border border-gray-200 p-3"
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                </select>
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(event) => setGenerateAudio(event.target.checked)}
                className="h-4 w-4"
              />
              Gerar áudio quando o modelo suportar
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={createVideo}
                disabled={loading || loadingReferences || prompt.trim().length < 5}
                className="rounded-2xl bg-gray-950 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Criando job..." : "Gerar vídeo"}
              </button>

              <button
                onClick={checkStatus}
                disabled={!job?.polling_url || checking}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checking ? "Consultando..." : "Consultar status"}
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <aside className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-950">Resultado</h2>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={autoPoll}
                  onChange={(event) => setAutoPoll(event.target.checked)}
                />
                Auto status
              </label>
            </div>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              <p><strong>Status:</strong> {job?.status || "nenhum job criado"}</p>
              {job?.id && <p className="mt-1 break-all"><strong>ID:</strong> {job.id}</p>}
              {job?.polling_url && (
                <p className="mt-1 break-all"><strong>Polling:</strong> {job.polling_url}</p>
              )}
              {job?.error && <p className="mt-1 text-red-600"><strong>Erro:</strong> {job.error}</p>}
            </div>

            {videoUrl ? (
              <div className="mt-5">
                <video src={videoUrl} controls className="w-full rounded-2xl bg-black" />
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-semibold underline"
                >
                  Abrir vídeo em nova aba
                </a>
              </div>
            ) : (
              <div className="mt-5 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                O vídeo aparecerá aqui quando o job for concluído.
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
