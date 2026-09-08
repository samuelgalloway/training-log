// Raw logged rows for the History screen. History's derived stats (e1RM,
// RPE drift, progression status) are computed client-side from these using
// the same pure lib/ functions the brief route uses server-side — the
// brief's "compute server-side, never hand raw rows to a model" rule is
// about the LLM-facing /api/brief output, not this UI-facing read.
import { NextResponse } from "next/server";
import { readSessions, readSets } from "@/lib/server/sheets";

export async function GET() {
  try {
    const [sets, sessions] = await Promise.all([readSets(), readSessions()]);
    return NextResponse.json({ sets, sessions });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
