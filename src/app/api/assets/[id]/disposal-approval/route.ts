import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { DisposalApprovalStatus } from "@prisma/client";
import prisma from "@backend/lib/prisma";
import { getUserFromRequest } from "@backend/lib/jwt";
import { sendDisposalApprovalEmail } from "@backend/lib/email";

const TEST_RECIPIENT_EMAIL = "davidryan0203@gmail.com";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let requestBody: { stateComments?: unknown } = {};
  try {
    requestBody = await req.json();
  } catch {
    requestBody = {};
  }

  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      assetTag: true,
      assetState: true,
      stateComments: true,
      disposalApprovalPending: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  if (asset.assetState === "Disposed") {
    return NextResponse.json({ message: "Asset is already disposed" }, { status: 400 });
  }

  if (asset.disposalApprovalPending) {
    return NextResponse.json({ message: "Disposal approval is already pending for this asset" }, { status: 409 });
  }

  const token = randomBytes(32).toString("hex");
  const requestRecord = await prisma.disposalApprovalRequest.create({
    data: {
      asset: { connect: { id: asset.id } },
      requestedBy: { connect: { id: currentUser.id } },
      recipientEmail: TEST_RECIPIENT_EMAIL,
      token,
      status: DisposalApprovalStatus.Pending,
    },
    select: { id: true, token: true },
  });

  await prisma.asset.update({
    where: { id: asset.id },
    data: {
      disposalApprovalPending: true,
      disposalApprovalRequestedAt: new Date(),
    },
  });

  const origin = new URL(req.url).origin;
  const appBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || origin;
  const approveUrl = `${appBaseUrl}/api/assets/disposal-approval/approve?token=${requestRecord.token}`;
  const declineUrl = `${appBaseUrl}/api/assets/disposal-approval/decline?token=${requestRecord.token}`;
  const stateComments = typeof requestBody.stateComments === "string"
    ? requestBody.stateComments
    : (asset.stateComments || "");

  try {
    await sendDisposalApprovalEmail({
      recipientEmail: TEST_RECIPIENT_EMAIL,
      requestedByName: currentUser.name,
      assetTag: asset.assetTag,
      assetName: asset.name,
      currentState: asset.assetState,
      stateComments,
      approveUrl,
      declineUrl,
    });
  } catch (error) {
    await prisma.$transaction([
      prisma.disposalApprovalRequest.update({
        where: { id: requestRecord.id },
        data: {
          status: DisposalApprovalStatus.Cancelled,
          actedAt: new Date(),
        },
      }),
      prisma.asset.update({
        where: { id: asset.id },
        data: {
          disposalApprovalPending: false,
          disposalApprovalRequestedAt: null,
        },
      }),
    ]);

    const message = error instanceof Error ? error.message : "Failed to send approval email";
    return NextResponse.json({ message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Disposal approval request sent successfully",
  });
}
