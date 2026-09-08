import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/brief";
import { getActiveBlock } from "@/lib/server/drive";
import { readBody, readSessions, readSets } from "@/lib/server/sheets";
import { toIsoDate } from "@/lib/dateUtils";

export async function GET() {
  try {
    const block = await getActiveBlock();
    if (!block) {
      return NextResponse.json({ error: "No active block. Import one from Setup first." }, { status: 400 });
    }
    const [sets, sessions, body] = await Promise.all([readSets(), readSessions(), readBody()]);
    const markdown = generateBrief(block, sets, sessions, body, toIsoDate(new Date()));
    return NextResponse.json({ markdown });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
