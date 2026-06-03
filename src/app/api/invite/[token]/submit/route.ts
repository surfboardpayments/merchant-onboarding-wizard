import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const repo = getRepository();
    const invite = repo.getInvite(token);

    // Validate the token
    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 },
      );
    }

    if (invite.used_at) {
      return NextResponse.json(
        { error: "Invite already used" },
        { status: 410 },
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invite expired" },
        { status: 410 },
      );
    }

    const body = await request.json();
    const { dayOfBirth, phone, email, address } = body;

    // Merge submitted data into the existing person data
    let existingData: Record<string, unknown> = {};
    if (invite.person_data) {
      try {
        existingData = JSON.parse(invite.person_data);
      } catch {
        // Start fresh
      }
    }

    const updatedData = {
      ...existingData,
      dayOfBirth,
      phone,
      email,
      address,
      submittedAt: new Date().toISOString(),
    };

    // Update the invite with the submitted data
    repo.updateInvitePersonData(token, JSON.stringify(updatedData));

    // Mark the invite as used
    repo.markInviteUsed(token);

    return NextResponse.json({
      success: true,
      message: "Personal details submitted successfully",
    });
  } catch (error) {
    console.error("Invite submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit verification data" },
      { status: 500 },
    );
  }
}
