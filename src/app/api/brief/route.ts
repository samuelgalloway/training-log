import { NextRequest, NextResponse } from "next/server";
import { generateBrief } from "@/lib/brief";
import { getActiveBlock } from "@/lib/server/drive";
import { readBody, readSessions, readSets } from "@/lib/server/sheets";
import { googleErrorMessage } from "@/lib/server/googleAuth";
import { toIsoDate } from "@/lib/dateUtils";

export async function GET(req: NextRequest) {
  try {
    const block = await getActiveBlock();
    if (!block) {
      return NextResponse.json({ error: "No active block. Import one from Setup first." }, { status: 400 });
    }
    const [sets, sessions, body] = await Promise.all([readSets(), readSessions(), readBody()]);
    // The server's own "now" is whatever timezone Vercel runs in, not Sam's —
    // prefer the client-supplied local date; fall back to the server's UTC
    // date only if it's ever hit some other way (e.g. curl).
    const asOf = req.nextUrl.searchParams.get("asOf") ?? toIsoDate(new Date());
    const markdown = generateBrief(block, sets, sessions, body, asOf);
    return NextResponse.json({ markdown });
  } catch (err) {
    return NextResponse.json({ error: googleErrorMessage(err) }, { status: 500 });
  }
}
