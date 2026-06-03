import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { tokens } = await request.json();

    if (!Array.isArray(tokens)) {
      return NextResponse.json(
        { error: "tokens must be an array" },
        { status: 400 },
      );
    }

    // Bound the request size to avoid unbounded work from a single call.
    if (tokens.length > 100) {
      return NextResponse.json(
        { error: "Too many tokens (max 100)" },
        { status: 400 },
      );
    }

    const repo = getRepository();
    const statuses = repo.getInviteStatuses(tokens);

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error("Invite status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statuses" },
      { status: 500 },
    );
  }
}
