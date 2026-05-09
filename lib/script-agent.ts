import { ScriptPlan } from "@/types/video";

export const SCRIPT_AGENT_SKILL = `
Você é o Agente de Roteiro para Vídeo Longo.

Regras:
- Transforme o prompt inicial em um roteiro dividido em cenas curtas.
- Cada cena deve respeitar a duração máxima informada.
- O total deve ficar próximo da duração solicitada e nunca ultrapassar 120 segundos.
- Mantenha continuidade visual entre cenas.
- Cada cena precisa ser gerável por um modelo de vídeo de poucos segundos.
- Retorne somente JSON válido, sem markdown.
- Não inclua conteúdo adulto, perigoso, ilegal ou graficamente violento.

Formato JSON obrigatório:
{
  "title": "string",
  "total_duration_seconds": number,
  "style": "string",
  "aspect_ratio": "16:9" | "9:16" | "1:1",
  "language": "pt-BR" | "en-US",
  "scenes": [
    {
      "scene_number": number,
      "title": "string",
      "duration_seconds": number,
      "visual_prompt": "string",
      "narration": "string",
      "camera": "string",
      "transition_to_next": "string",
      "reference_usage": "string"
    }
  ]
}
`;

export function normalizePlan(plan: ScriptPlan, targetDuration: number, maxSceneDuration: number): ScriptPlan {
  const safeTarget = Math.min(Math.max(targetDuration, 5), 120);
  const safeMaxScene = Math.min(Math.max(maxSceneDuration, 3), 15);
  const scenes = plan.scenes.map((scene, index) => ({
    ...scene,
    scene_number: index + 1,
    duration_seconds: Math.min(Math.max(Math.round(scene.duration_seconds || safeMaxScene), 3), safeMaxScene)
  }));

  const total = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);

  return {
    ...plan,
    total_duration_seconds: Math.min(total || safeTarget, 120),
    scenes
  };
}
