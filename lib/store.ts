import { promises as fs } from "fs";
import path from "path";
import { GenerationRecord } from "@/types/video";

const STORE_DIR = path.join(process.cwd(), ".local-data", "generations");

async function ensureStore() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

export async function saveGeneration(record: GenerationRecord) {
  await ensureStore();
  await fs.writeFile(path.join(STORE_DIR, `${record.id}.json`), JSON.stringify(record, null, 2), "utf-8");
}

export async function readGeneration(id: string): Promise<GenerationRecord> {
  await ensureStore();
  const raw = await fs.readFile(path.join(STORE_DIR, `${id}.json`), "utf-8");
  return JSON.parse(raw);
}

export async function listGenerations(): Promise<GenerationRecord[]> {
  await ensureStore();
  const files = await fs.readdir(STORE_DIR);
  const records = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => JSON.parse(await fs.readFile(path.join(STORE_DIR, file), "utf-8")))
  );
  return records.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
