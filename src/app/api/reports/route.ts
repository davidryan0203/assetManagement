import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeReport } from "@backend/lib/mysqlSerializers";

// GET all reports
export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const reports = await prisma.report.findMany({
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      folder: { include: { createdBy: { select: { id: true, firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reports: reports.map(serializeReport) });
}

// POST create report
export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, reportType, module: mod, subModule } = body;

  if (!title?.trim() || !mod || !subModule) {
    return NextResponse.json(
      { message: "Title, module, and sub-module are required" },
      { status: 400 }
    );
  }

  const report = await prisma.report.create({
    data: {
      title: title.trim(),
      reportType: reportType || "Tabular",
      module: mod,
      subModule,
      selectedColumns: body.selectedColumns || [],
      filters: body.filters || [],
      ...(body.folder ? { folder: { connect: { id: body.folder } } } : {}),
      createdBy: { connect: { id: currentUser.id } },
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      folder: { include: { createdBy: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  return NextResponse.json({ report: serializeReport(report) }, { status: 201 });
}
