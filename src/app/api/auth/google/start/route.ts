// Step 1 of the in-app "Connect Google" flow (see the Setup screen): builds
// the Google consent URL using THIS request's own origin as the redirect —
// so it's automatically correct whether you're on your Vercel production
// URL or localhost, as long as that exact URL is registered as an
// authorized redirect URI on the OAuth client (see README.md).
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { requireEnv } from "@/lib/server/googleAuth";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export async function GET(req: NextRequest) {
  try {
    const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // force a refresh_token even if this Google account authorized before
      scope: SCOPES,
    });

    return NextResponse.redirect(url);
  } catch (err) {
    return new NextResponse(`<p>Couldn't start Google sign-in: ${(err as Error).message}</p><p>Check GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are set — see README.md.</p>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
