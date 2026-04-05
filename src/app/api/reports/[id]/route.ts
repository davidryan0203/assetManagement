import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeReport } from "@backend/lib/mysqlSerializers";

// GET single report
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      folder: { include: { createdBy: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  if (!report) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ report: serializeReport(report) });
}

// PUT update report
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const report = await prisma.report.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.reportType !== undefined ? { reportType: body.reportType } : {}),
        ...(body.module !== undefined ? { module: body.module } : {}),
        ...(body.subModule !== undefined ? { subModule: body.subModule } : {}),
        ...(body.selectedColumns !== undefined ? { selectedColumns: body.selectedColumns || [] } : {}),
        ...(body.filters !== undefined ? { filters: body.filters || [] } : {}),
        ...(body.folder !== undefined
          ? body.folder
            ? { folder: { connect: { id: body.folder } } }
            : { folder: { disconnect: true } }
          : {}),
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        folder: { include: { createdBy: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    return NextResponse.json({ report: serializeReport(report) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    throw error;
  }
}

// DELETE report
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.report.delete({ where: { id } }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return;
    }
    throw error;
  });
  return NextResponse.json({ message: "Report deleted" });
}
