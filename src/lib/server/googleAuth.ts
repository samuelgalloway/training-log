// Server-only. Never import this from a client component — the whole point
// is that these credentials never reach the client bundle.
import "server-only";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"];

let cached: InstanceType<typeof google.auth.JWT> | null = null;

export function getGoogleAuth() {
  if (cached) return cached;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY env vars. See .env.example."
    );
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");

  cached = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  return cached;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}. See .env.example.`);
  return value;
}
