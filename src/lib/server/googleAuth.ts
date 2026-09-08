// Server-only. Never import this from a client component — the whole point
// is that these credentials never reach the client bundle.
//
// OAuth, not a service account: a single narrow scope (drive.file) that can
// only ever touch files THIS app created (the Drive folder + block JSON
// files, and the Sheet it creates via the Sheets API — Sheets are Drive
// files under the hood, so drive.file access carries over to the Sheets API
// calls in sheets.ts). There's no "share this with a weird email" step —
// visit /setup on the deployed app and click "Connect Google" (see
// src/app/api/auth/google/ and README.md) to mint the refresh token and
// bootstrap the folder + Sheet, entirely in the browser.
import "server-only";
import { google } from "googleapis";

let cached: InstanceType<typeof google.auth.OAuth2> | null = null;

export function getGoogleAuth() {
  if (cached) return cached;

  const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN");

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  // google-auth-library transparently exchanges this for a fresh access
  // token (and re-exchanges on expiry) on every API call — no manual
  // refresh handling needed here, same as the old JWT client's behavior.

  cached = client;
  return cached;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}. See .env.example.`);
  return value;
}
