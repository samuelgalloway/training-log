#!/usr/bin/env node
// One-time setup: mints an OAuth refresh token (drive.file scope only —
// this app will only ever be able to see files it creates itself) and
// bootstraps the Drive folder + Google Sheet this app needs.
//
// MUST be run from your own machine, not from a remote/cloud shell — it
// opens a real browser and needs a loopback redirect back to this process.
//
// Usage:
//   1. Fill in GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env
//      (see .env.example and README.md for how to create an OAuth client).
//   2. npm run setup:google
//   3. Open the printed URL, authorize, click through the "unverified app"
//      warning (expected — see README).
//   4. Copy the printed env block into .env (and later into Vercel).
//
// Plain Node, no TS/bundler involved — this runs once, outside the app's
// normal build, so a little duplication (the Sheets header rows also live
// in src/lib/server/sheets.ts) is the right trade here, not a shared module.

import "dotenv/config";
import http from "node:http";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const SETS_HEADER = ["session_id", "date", "exercise", "implement", "set_index", "weight_lb", "reps", "rpe", "note"];
const SESSIONS_HEADER = [
  "session_id", "date", "block_id", "week", "dow", "type", "name", "status",
  "sleep", "soreness", "joint_flag", "note", "rpe", "avg_hr", "distance_mi",
];
const BODY_HEADER = ["date", "bodyweight_lb", "waist_in", "chest_in", "arm_in", "thigh_in"];

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.\n" +
        "Create an OAuth client (Application type: Desktop app) in Google Cloud Console\n" +
        "under APIs & Services -> Credentials, and put its ID/secret in .env first.\n" +
        "See README.md for the full walkthrough."
    );
    process.exit(1);
  }

  const { code, redirectUri, server } = await getAuthCode(clientId, clientSecret);
  server.close();

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oAuth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      "\nGoogle didn't return a refresh token. This usually means you've already\n" +
        "authorized this app before. Revoke access at\n" +
        "https://myaccount.google.com/permissions and run this script again.\n"
    );
    process.exit(1);
  }

  oAuth2Client.setCredentials(tokens);

  console.log("\nAuthorized. Creating the Drive folder and Google Sheet…\n");
  const { folderId, spreadsheetId } = await bootstrapWorkspace(oAuth2Client);

  console.log("\nDone! Add these to .env (and to your Vercel project's env vars):\n");
  console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
  console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`);
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_DRIVE_FOLDER_ID=${folderId}`);
  console.log(`GOOGLE_SHEETS_ID=${spreadsheetId}`);
  console.log("");
}

/** Spins up a temporary loopback server, prints the consent URL, and resolves with the `code` Google redirects back with. */
function getAuthCode(clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    // Assigned once the server is listening and we know which port we got;
    // both the listen callback and the request handler below close over it.
    let redirectUri;

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        error
          ? `<p>Authorization failed: ${error}. You can close this tab.</p>`
          : "<p>Authorized — you can close this tab and go back to the terminal.</p>"
      );

      if (error) reject(new Error(error));
      else resolve({ code, redirectUri, server });
    });

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
      const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent", // force a refresh_token even if you've authorized before
        scope: SCOPES,
      });
      console.log("Open this URL in your browser to authorize:\n");
      console.log(authUrl);
      console.log("\nWaiting for you to authorize…");
    });
  });
}

async function bootstrapWorkspace(auth, folderName = "Training Log", sheetName = "Training Log") {
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  const folderRes = await drive.files.create({
    requestBody: { name: folderName, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  const folderId = folderRes.data.id;

  const sheetRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: sheetName },
      sheets: [{ properties: { title: "sets" } }, { properties: { title: "sessions" } }, { properties: { title: "body" } }],
    },
    fields: "spreadsheetId",
  });
  const spreadsheetId = sheetRes.data.spreadsheetId;

  await sheets.spreadsheets.values.update({ spreadsheetId, range: "sets!A1", valueInputOption: "RAW", requestBody: { values: [SETS_HEADER] } });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: "sessions!A1", valueInputOption: "RAW", requestBody: { values: [SESSIONS_HEADER] } });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: "body!A1", valueInputOption: "RAW", requestBody: { values: [BODY_HEADER] } });

  const fileRes = await drive.files.get({ fileId: spreadsheetId, fields: "parents" });
  const previousParents = (fileRes.data.parents ?? []).join(",");
  await drive.files.update({ fileId: spreadsheetId, addParents: folderId, removeParents: previousParents, fields: "id, parents" });

  return { folderId, spreadsheetId };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
