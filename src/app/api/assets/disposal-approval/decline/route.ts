import { NextRequest, NextResponse } from "next/server";
import { DisposalApprovalStatus } from "@prisma/client";
import prisma from "@backend/lib/prisma";

function htmlResponse(title: string, message: string, ok: boolean) {
  const color = ok ? "#166534" : "#b91c1c";
  return new NextResponse(
    `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
    <div style="max-width: 560px; margin: 48px auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
      <h1 style="margin: 0 0 12px; color: ${color}; font-size: 22px;">${title}</h1>
      <p style="margin: 0; color: #374151; font-size: 15px;">${message}</p>
    </div>
  </body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return htmlResponse("Invalid Request", "Missing approval token.", false);
  }

  const approval = await prisma.disposalApprovalRequest.findUnique({
    where: { token },
    include: {
      asset: { select: { id: true, assetTag: true } },
    },
  });

  if (!approval) {
    return htmlResponse("Invalid Request", "Approval request was not found.", false);
  }

  if (approval.status !== DisposalApprovalStatus.Pending) {
    return htmlResponse("Request Already Processed", `This request is already ${approval.status.toLowerCase()}.`, false);
  }

  await prisma.$transaction([
    prisma.disposalApprovalRequest.update({
      where: { id: approval.id },
      data: {
        status: DisposalApprovalStatus.Declined,
        actedAt: new Date(),
      },
    }),
    prisma.asset.update({
      where: { id: approval.assetId },
      data: {
        disposalApprovalPending: false,
        disposalApprovalRequestedAt: null,
      },
    }),
  ]);

  return htmlResponse(
    "Request Declined",
    `Disposal request for asset ${approval.asset.assetTag} has been declined.`,
    true
  );
}
