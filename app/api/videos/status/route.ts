import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVideoStatus } from "@/lib/openrouter";

const schema = z.object({
  polling_url: z.string().url("polling_url inválida."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { polling_url } = schema.parse(body);
    const status = await getVideoStatus(polling_url);

    return NextResponse.json({
      id: status.id,
      status: status.status,
      unsigned_urls: status.unsigned_urls || [],
      error: status.error || null,
      raw: status,
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
