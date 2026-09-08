// Server-only. Google Drive holds two kinds of file, both inside one folder
// (GOOGLE_DRIVE_FOLDER_ID, created by the "Connect Google" flow — see
// src/app/api/auth/google/ and src/lib/server/bootstrap.ts):
// `config.json` (equipment/plate inventory + which block is active) and
// `block-<id>.json` (one per training block, active or archived — never
// overwritten wholesale, only status/outcome fields are amended on
// archive). Auth is OAuth with drive.file scope (see googleAuth.ts) — every
// file here was created by this app, which is exactly what that scope
// grants access to.
import "server-only";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { getGoogleAuth, requireEnv } from "./googleAuth";
import type { AppConfig, Block, BlockSummary } from "../types";

const CONFIG_FILENAME = "config.json";

function driveClient() {
  return google.drive({ version: "v3", auth: getGoogleAuth() });
}

async function findFileByName(name: string): Promise<{ id: string } | null> {
  const folderId = requireEnv("GOOGLE_DRIVE_FOLDER_ID");
  const res = await driveClient().files.list({
    q: `'${folderId}' in parents and name = '${name}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  const file = res.data.files?.[0];
  return file?.id ? { id: file.id } : null;
}

async function downloadJson<T>(fileId: string): Promise<T> {
  const res = await driveClient().files.get({ fileId, alt: "media" }, { responseType: "json" });
  return res.data as T;
}

function toStream(content: string): Readable {
  return Readable.from([content]);
}

async function createJsonFile(name: string, data: unknown): Promise<string> {
  const folderId = requireEnv("GOOGLE_DRIVE_FOLDER_ID");
  const res = await driveClient().files.create({
    requestBody: { name, parents: [folderId], mimeType: "application/json" },
    media: { mimeType: "application/json", body: toStream(JSON.stringify(data, null, 2)) },
    fields: "id",
  });
  if (!res.data.id) throw new Error(`Drive did not return a file id for ${name}`);
  return res.data.id;
}

async function updateJsonFile(fileId: string, data: unknown): Promise<void> {
  await driveClient().files.update({
    fileId,
    media: { mimeType: "application/json", body: toStream(JSON.stringify(data, null, 2)) },
  });
}

// ---------------------------------------------------------------- config

export function defaultConfig(): AppConfig {
  return {
    equipment: {
      plate_inventory: { unit: "lb", pairs: {} },
      kettlebell_sizes_owned: [],
      implements: [],
    },
    active_block_id: null,
  };
}

export async function getConfig(): Promise<AppConfig> {
  const file = await findFileByName(CONFIG_FILENAME);
  if (!file) return defaultConfig();
  return downloadJson<AppConfig>(file.id);
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const file = await findFileByName(CONFIG_FILENAME);
  if (file) {
    await updateJsonFile(file.id, config);
  } else {
    await createJsonFile(CONFIG_FILENAME, config);
  }
}

// ---------------------------------------------------------------- blocks

function blockFilename(blockId: string): string {
  return `block-${blockId}.json`;
}

export async function listBlocks(): Promise<BlockSummary[]> {
  const folderId = requireEnv("GOOGLE_DRIVE_FOLDER_ID");
  const res = await driveClient().files.list({
    q: `'${folderId}' in parents and name contains 'block-' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  const files = res.data.files ?? [];
  const summaries: BlockSummary[] = [];
  for (const f of files) {
    if (!f.id) continue;
    const block = await downloadJson<Block>(f.id);
    summaries.push({
      id: block.block.id,
      name: block.block.name,
      sequence: block.block.sequence,
      status: block.status ?? "archived",
      start_date: block.block.start_date,
      end_date: block.block.end_date,
      drive_file_id: f.id,
    });
  }
  return summaries.sort((a, b) => a.sequence - b.sequence);
}

export async function getBlockByFileId(fileId: string): Promise<Block> {
  return downloadJson<Block>(fileId);
}

export async function getActiveBlock(): Promise<Block | null> {
  const config = await getConfig();
  if (!config.active_block_id) return null;
  const file = await findFileByName(blockFilename(config.active_block_id));
  if (!file) return null;
  return getBlockByFileId(file.id);
}

/**
 * Imports a new block, archives whatever was active (with an optional
 * outcome summary), and points config.active_block_id at the new one.
 * Never overwrites an existing block file wholesale — archiving only amends
 * status/outcome_summary on the file that's already there.
 */
export async function importBlockAndActivate(newBlock: Block, outcomeSummaryForPrevious?: string): Promise<Block> {
  const config = await getConfig();

  if (config.active_block_id && config.active_block_id !== newBlock.block.id) {
    const prevFile = await findFileByName(blockFilename(config.active_block_id));
    if (prevFile) {
      const prevBlock = await getBlockByFileId(prevFile.id);
      prevBlock.status = "archived";
      if (outcomeSummaryForPrevious) prevBlock.outcome_summary = outcomeSummaryForPrevious;
      await updateJsonFile(prevFile.id, prevBlock);
    }
  }

  const toSave: Block = { ...newBlock, status: "active", imported_at: new Date().toISOString() };
  const existing = await findFileByName(blockFilename(newBlock.block.id));
  let fileId: string;
  if (existing) {
    await updateJsonFile(existing.id, toSave);
    fileId = existing.id;
  } else {
    fileId = await createJsonFile(blockFilename(newBlock.block.id), toSave);
  }
  toSave.drive_file_id = fileId;

  config.active_block_id = newBlock.block.id;
  await saveConfig(config);

  return toSave;
}
