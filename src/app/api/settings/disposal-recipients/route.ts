import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import { getDisposalRecipientEmails, setDisposalRecipientEmails } from "@backend/lib/appSettings";

export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const recipients = await getDisposalRecipientEmails();
    return NextResponse.json({ recipients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recipients";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const rawRecipients = Array.isArray(body?.recipients) ? body.recipients : [];
  const recipients = rawRecipients.filter((value: unknown): value is string => typeof value === "string");

  try {
    const saved = await setDisposalRecipientEmails(recipients);
    return NextResponse.json({ message: "Recipients saved", recipients: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save recipients";
    return NextResponse.json({ message }, { status: 400 });
  }
}
