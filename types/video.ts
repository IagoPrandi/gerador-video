export type AspectRatio = "16:9" | "9:16" | "1:1";
export type Resolution = "480p" | "720p" | "1080p";

export type VideoCreateInput = {
  prompt: string;
  references?: string[];
  duration?: number;
  resolution?: Resolution;
  aspect_ratio?: AspectRatio;
  generate_audio?: boolean;
};

export type VideoModelInfo = {
  id: string;
  name: string;
  description?: string;
  supported_durations?: number[] | null;
  supported_resolutions?: string[] | null;
  supported_aspect_ratios?: string[] | null;
  pricing_skus?: Record<string, string> | null;
};

export type ScriptModelInfo = {
  id: string;
  name: string;
  context_length?: number;
};

export type ScenePlan = {
  scene_number: number;
  title: string;
  duration_seconds: number;
  visual_prompt: string;
  narration?: string;
  camera?: string;
  transition_to_next?: string;
  reference_usage?: string;
};

export type ScriptPlan = {
  title: string;
  total_duration_seconds: number;
  style: string;
  aspect_ratio: AspectRatio;
  language: "pt-BR" | "en-US";
  scenes: ScenePlan[];
};

export type SceneJob = ScenePlan & {
  job_id?: string;
  polling_url?: string;
  status: "planned" | "pending" | "processing" | "in_progress" | "completed" | "failed";
  unsigned_urls?: string[];
  error?: string;
};

export type GenerationRecord = {
  id: string;
  created_at: string;
  status: "planning" | "generating" | "ready_to_merge" | "completed" | "failed";
  prompt: string;
  script_model: string;
  video_model: string;
  target_duration_seconds: number;
  aspect_ratio: AspectRatio;
  resolution: Resolution;
  references: string[];
  plan: ScriptPlan;
  scenes: SceneJob[];
  final_video_url?: string;
  error?: string;
};
