import { NextRequest, NextResponse } from "next/server";
import { importBlockAndActivate, listBlocks } from "@/lib/server/drive";
import { googleErrorMessage } from "@/lib/server/googleAuth";
import type { Block } from "@/lib/types";

export async function GET() {
  try {
    const blocks = await listBlocks();
    return NextResponse.json(blocks);
  } catch (err) {
    return NextResponse.json({ error: googleErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { block: Block; outcomeSummaryForPrevious?: string };
    if (!body.block?.block?.id) {
      return NextResponse.json({ error: "Block JSON is missing block.id — is this valid schema_version 1?" }, { status: 400 });
    }
    const saved = await importBlockAndActivate(body.block, body.outcomeSummaryForPrevious);
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json({ error: googleErrorMessage(err) }, { status: 500 });
  }
}
