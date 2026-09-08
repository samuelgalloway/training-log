import { NextRequest, NextResponse } from "next/server";
import { appendBody, readBody } from "@/lib/server/sheets";
import type { BodyEntry } from "@/lib/types";

export async function GET() {
  try {
    const entries = await readBody();
    return NextResponse.json(entries);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const entry = (await req.json()) as BodyEntry;
    if (!entry.date) return NextResponse.json({ error: "Missing date." }, { status: 400 });
    await appendBody(entry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
