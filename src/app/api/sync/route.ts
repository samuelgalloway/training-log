// Batched end-of-session sync. The ONLY network call in the whole logging
// flow — everything up to this point lived in local state. See
// src/lib/localStore.ts and the Today screen for the local-first side of
// this contract.
import { NextRequest, NextResponse } from "next/server";
import { appendSession, appendSets } from "@/lib/server/sheets";
import type { LoggedSession, LoggedSet } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { session: LoggedSession; sets: LoggedSet[] };
    if (!body.session?.session_id) {
      return NextResponse.json({ error: "Missing session." }, { status: 400 });
    }
    await appendSets(body.sets ?? []);
    await appendSession(body.session);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
