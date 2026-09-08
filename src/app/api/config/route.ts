import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/server/drive";
import type { AppConfig } from "@/lib/types";

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const config = (await req.json()) as AppConfig;
    await saveConfig(config);
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
