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

export type VideoJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type VideoJob = {
  id: string;
  status: VideoJobStatus;
  polling_url?: string;
  unsigned_urls?: string[];
  error?: string | null;
};
