import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Check basic token format (UUID-HMAC)
  if (token.length < 36) {
    return NextResponse.json(
      { error: "Invalid token format" },
      { status: 400 },
    );
  }

  const repo = getRepository();
  const invite = repo.getInvite(token);

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.used_at) {
    return NextResponse.json(
      { error: "Invite already used" },
      { status: 410 },
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  // Parse stored person data
  let personInfo: Record<string, unknown> = {};
  if (invite.person_data) {
    try {
      personInfo = JSON.parse(invite.person_data);
    } catch {
      // Use defaults from invite fields
    }
  }

  return NextResponse.json({
    valid: true,
    person: {
      firstName: personInfo.firstName || invite.person_name.split(" ")[0] || "",
      lastName:
        personInfo.lastName ||
        invite.person_name.split(" ").slice(1).join(" ") ||
        "",
      middleName: (personInfo.middleName as string) || "",
      companyName: invite.company_name || "",
      dateOfBirth: personInfo.dateOfBirth || null,
      nationality: (personInfo.nationality as string) || null,
      address: personInfo.address || null,
    },
    expiresAt: invite.expires_at,
  });
}
