import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Report from "@backend/models/Report";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET all reports
export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const reports = await Report.find()
    .populate("createdBy", "name")
    .populate("folder", "name")
    .sort({ createdAt: -1 });

  return NextResponse.json({ reports });
}

// POST create report
export async function POST(req: NextRequest) {
  await dbConnect();
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

  const report = await Report.create({
    title: title.trim(),
    reportType: reportType || "Tabular",
    module: mod,
    subModule,
    selectedColumns: body.selectedColumns || [],
    filters: body.filters || [],
    folder: body.folder || null,
    createdBy: currentUser.id,
  });

  return NextResponse.json({ report }, { status: 201 });
}
