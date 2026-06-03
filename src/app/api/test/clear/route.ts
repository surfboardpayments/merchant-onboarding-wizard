import { NextResponse } from "next/server";
import { isTestMode } from "@/lib/utils/testMode";
import { getRepository } from "@/lib/db";

export async function POST() {
  if (!isTestMode()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const repo = getRepository();
    repo.clearAll();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to clear database:", error);
    return NextResponse.json(
      { error: "Failed to clear database" },
      { status: 500 },
    );
  }
}
