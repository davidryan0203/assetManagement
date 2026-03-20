import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeReportFolder } from "@backend/lib/mysqlSerializers";

// GET all folders
export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const folders = await prisma.reportFolder.findMany({
    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ folders: folders.map(serializeReportFolder) });
}

// POST create folder
export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ message: "Folder name is required" }, { status: 400 });
  }

  const folder = await prisma.reportFolder.create({
    data: { name: name.trim(), createdBy: { connect: { id: currentUser.id } } },
    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json({ folder: serializeReportFolder(folder) }, { status: 201 });
}
