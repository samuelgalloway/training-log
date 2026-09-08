// Step 2 of the in-app "Connect Google" flow: Google redirects back here
// with a `code`. We exchange it for a refresh token, bootstrap the Drive
// folder + Sheet on first connect (skipped if already configured — see
// below), and render a plain HTML page with the values to paste into
// Vercel's Environment Variables. Nothing here needs a terminal.
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireEnv } from "@/lib/server/googleAuth";
import { bootstrapWorkspace } from "@/lib/server/bootstrap";

function page(bodyHtml: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Connect Google — Training Log</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f7f6f3; color: #111318; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
        code, pre { background: #eceae4; border-radius: 6px; padding: 0.15rem 0.4rem; font-size: 0.9em; }
        pre { padding: 1rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
        .card { background: white; border: 1px solid #dcd9d2; border-radius: 16px; padding: 1.25rem; margin: 1rem 0; }
        .warn { color: #b5502f; }
        a.btn { display: inline-block; background: #2f6f4f; color: white; text-decoration: none; padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 600; }
      </style>
    </head><body>${bodyHtml}</body></html>`,
    { status, headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get("error");
  if (error) {
    return page(`<h1>Connection cancelled</h1><p>Google reported: <code>${error}</code>. <a href="/setup">Back to Setup</a> to try again.</p>`, 400);
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return page(`<h1>Missing authorization code</h1><p>Something odd happened — <a href="/setup">back to Setup</a> to try again.</p>`, 400);
  }

  try {
    const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      return page(
        `<h1 class="warn">No refresh token returned</h1>
         <p>This usually means this Google account already authorized this app once before, and Google only issues a refresh token on the first consent (or after it's revoked).</p>
         <p>Fix: revoke this app's access at
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">myaccount.google.com/permissions</a>,
            then <a href="/api/auth/google/start">try connecting again</a>.</p>`,
        400
      );
    }

    client.setCredentials(tokens);

    const alreadyBootstrapped = Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_SHEETS_ID);
    const bootstrap = alreadyBootstrapped ? null : await bootstrapWorkspace(client);

    const envLines = [
      `GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`,
      ...(bootstrap ? [`GOOGLE_DRIVE_FOLDER_ID=${bootstrap.folderId}`, `GOOGLE_SHEETS_ID=${bootstrap.spreadsheetId}`] : []),
    ];

    return page(`
      <h1>✅ Connected</h1>
      ${bootstrap ? "<p>Created a <strong>Training Log</strong> folder and Google Sheet in your Drive, under your own account.</p>" : "<p>Reconnected — your existing Drive folder and Sheet are untouched.</p>"}
      <div class="card">
        <p><strong>Copy these into your Vercel project's Environment Variables</strong> (Project → Settings → Environment Variables), then redeploy:</p>
        <pre>${envLines.join("\n")}</pre>
      </div>
      <p class="warn">This page won't show the refresh token again — copy it now.</p>
      <p><a href="https://vercel.com/dashboard" class="btn" target="_blank" rel="noopener">Open Vercel dashboard →</a></p>
    `);
  } catch (err) {
    return page(`<h1 class="warn">Connection failed</h1><p>${(err as Error).message}</p><p><a href="/setup">Back to Setup</a> to try again.</p>`, 500);
  }
}
