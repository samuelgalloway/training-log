import { NextResponse } from "next/server";
import { getActiveBlock } from "@/lib/server/drive";
import { googleErrorMessage } from "@/lib/server/googleAuth";

export async function GET() {
  try {
    const block = await getActiveBlock();
    if (!block) return NextResponse.json(null);
    return NextResponse.json(block);
  } catch (err) {
    return NextResponse.json({ error: googleErrorMessage(err) }, { status: 500 });
  }
}
