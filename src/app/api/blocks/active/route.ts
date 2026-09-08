import { NextResponse } from "next/server";
import { getActiveBlock } from "@/lib/server/drive";

export async function GET() {
  try {
    const block = await getActiveBlock();
    if (!block) return NextResponse.json(null);
    return NextResponse.json(block);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
