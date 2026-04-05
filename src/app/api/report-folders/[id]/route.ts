import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeReportFolder } from "@backend/lib/mysqlSerializers";

// DELETE a folder (also unlinks reports from it)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.reportFolder.delete({ where: { id } }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return;
    }
    throw error;
  });

  await prisma.report.updateMany({ where: { folderId: id }, data: { folderId: null } });

  return NextResponse.json({ message: "Folder deleted" });
}

// PATCH rename folder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }

  const folder = await prisma.reportFolder.update({
    where: { id },
    data: { name: name.trim() },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  });

  if (!folder) return NextResponse.json({ message: "Folder not found" }, { status: 404 });
  return NextResponse.json({ folder: serializeReportFolder(folder) });
}
