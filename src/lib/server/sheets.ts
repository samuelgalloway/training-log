// Server-only. Reads/writes the three flat Sheets tabs: sets, sessions, body.
// Column order here IS the header row contract — scripts/setup-google-oauth.mjs
// creates the spreadsheet with these exact headers, so this file and that
// script must stay in sync if a column is ever added.
import "server-only";
import { google } from "googleapis";
import { getGoogleAuth, requireEnv } from "./googleAuth";
import type { BodyEntry, LoggedSession, LoggedSet } from "../types";

const SETS_RANGE = "sets!A:J";
const SESSIONS_RANGE = "sessions!A:O";
const BODY_RANGE = "body!A:F";

function sheetsClient() {
  return google.sheets({ version: "v4", auth: getGoogleAuth() });
}

function num(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

// ---------------------------------------------------------------- sets

export function setToRow(s: LoggedSet): (string | number)[] {
  return [
    s.session_id,
    s.date,
    s.exercise,
    s.implement,
    s.set_index,
    s.weight_lb ?? "",
    s.reps ?? "",
    s.rpe ?? "",
    s.note ?? "",
    s.brutal ? "TRUE" : "",
  ];
}

function rowToSet(row: unknown[]): LoggedSet {
  return {
    session_id: str(row[0]),
    date: str(row[1]),
    exercise: str(row[2]),
    implement: str(row[3]),
    set_index: num(row[4]) ?? 0,
    weight_lb: num(row[5]),
    reps: num(row[6]),
    rpe: num(row[7]),
    note: str(row[8]) || undefined,
    // Sheets rows synced before this column existed just have nothing here —
    // absent reads as false, same as never having tapped the toggle.
    brutal: str(row[9]).toUpperCase() === "TRUE",
  };
}

export async function appendSets(sets: LoggedSet[]): Promise<void> {
  if (sets.length === 0) return;
  const spreadsheetId = requireEnv("GOOGLE_SHEETS_ID");
  await sheetsClient().spreadsheets.values.append({
    spreadsheetId,
    range: SETS_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: sets.map(setToRow) },
  });
}

export async function readSets(): Promise<LoggedSet[]> {
  const spreadsheetId = requireEnv("GOOGLE_SHEETS_ID");
  const res = await sheetsClient().spreadsheets.values.get({ spreadsheetId, range: SETS_RANGE });
  const rows = (res.data.values ?? []).slice(1); // drop header row
  return rows.filter((r) => r.length > 0 && r[0]).map(rowToSet);
}

// ---------------------------------------------------------------- sessions

export function sessionToRow(s: LoggedSession): (string | number)[] {
  return [
    s.session_id,
    s.date,
    s.block_id,
    s.week,
    s.dow,
    s.type,
    s.name,
    s.status,
    s.sleep ?? "",
    s.soreness ?? "",
    s.joint_flag ?? "",
    s.note ?? "",
    s.rpe ?? "",
    s.avg_hr ?? "",
    s.distance_mi ?? "",
  ];
}

function rowToSession(row: unknown[]): LoggedSession {
  return {
    session_id: str(row[0]),
    date: str(row[1]),
    block_id: str(row[2]),
    week: num(row[3]) ?? 0,
    dow: str(row[4]) as LoggedSession["dow"],
    type: str(row[5]) as LoggedSession["type"],
    name: str(row[6]),
    status: str(row[7]) as LoggedSession["status"],
    sleep: num(row[8]),
    soreness: num(row[9]),
    joint_flag: str(row[10]) || undefined,
    note: str(row[11]) || undefined,
    rpe: num(row[12]),
    avg_hr: num(row[13]),
    distance_mi: num(row[14]),
  };
}

export async function appendSession(session: LoggedSession): Promise<void> {
  const spreadsheetId = requireEnv("GOOGLE_SHEETS_ID");
  await sheetsClient().spreadsheets.values.append({
    spreadsheetId,
    range: SESSIONS_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [sessionToRow(session)] },
  });
}

export async function readSessions(): Promise<LoggedSession[]> {
  const spreadsheetId = requireEnv("GOOGLE_SHEETS_ID");
  const res = await sheetsClient().spreadsheets.values.get({ spreadsheetId, range: SESSIONS_RANGE });
  const rows = (res.data.values ?? []).slice(1);
  return rows.filter((r) => r.length > 0 && r[0]).map(rowToSession);
}

// ---------------------------------------------------------------- body

export function bodyToRow(b: BodyEntry): (string | number)[] {
  return [b.date, b.bodyweight_lb ?? "", b.waist_in ?? "", b.chest_in ?? "", b.arm_in ?? "", b.thigh_in ?? ""];
}

function rowToBody(row: unknown[]): BodyEntry {
  return {
    date: str(row[0]),
    bodyweight_lb: num(row[1]),
    waist_in: num(row[2]),
    chest_in: num(row[3]),
    arm_in: num(row[4]),
    thigh_in: num(row[5]),
  };
}

export async function appendBody(entry: BodyEntry): Promise<void> {
  const spreadsheetId = requireEnv("GOOGLE_SHEETS_ID");
  await sheetsClient().spreadsheets.values.append({
    spreadsheetId,
    range: BODY_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [bodyToRow(entry)] },
  });
}

export async function readBody(): Promise<BodyEntry[]> {
  const spreadsheetId = requireEnv("GOOGLE_SHEETS_ID");
  const res = await sheetsClient().spreadsheets.values.get({ spreadsheetId, range: BODY_RANGE });
  const rows = (res.data.values ?? []).slice(1);
  return rows.filter((r) => r.length > 0 && r[0]).map(rowToBody);
}
