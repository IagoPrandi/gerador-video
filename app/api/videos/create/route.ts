import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createVideoJob } from "@/lib/openrouter";
import { buildVideoPrompt } from "@/lib/prompt-builder";

const dataImageUrlPattern = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const referenceSchema = z.string().refine(
  (value) => isHttpUrl(value) || dataImageUrlPattern.test(value),
  "Cada referencia precisa ser uma URL http(s) ou uma imagem local valida."
);

const schema = z.object({
  prompt: z.string().min(5, "O prompt precisa ter pelo menos 5 caracteres."),
  references: z.array(referenceSchema).optional(),
  duration: z.number().min(3).max(15).optional(),
  resolution: z.enum(["480p", "720p", "1080p"]).optional(),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).optional(),
  generate_audio: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = schema.parse(body);
    const finalPrompt = buildVideoPrompt(input.prompt);

    const job = await createVideoJob({
      ...input,
      prompt: finalPrompt,
    });

    return NextResponse.json({
      id: job.id,
      status: job.status,
      polling_url: job.polling_url,
      raw: job,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join(" ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado." },
      { status: 400 }
    );
  }
}
