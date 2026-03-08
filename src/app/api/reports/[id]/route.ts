import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Report from "@backend/models/Report";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET single report
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await Report.findById(id)
    .populate("createdBy", "name")
    .populate("folder", "name");

  if (!report) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ report });
}

// PUT update report
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const report = await Report.findByIdAndUpdate(
    id,
    {
      title: body.title,
      reportType: body.reportType,
      module: body.module,
      subModule: body.subModule,
      selectedColumns: body.selectedColumns || [],
      filters: body.filters || [],
      folder: body.folder || null,
    },
    { new: true }
  )
    .populate("createdBy", "name")
    .populate("folder", "name");

  if (!report) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ report });
}

// DELETE report
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await Report.findByIdAndDelete(id);
  return NextResponse.json({ message: "Report deleted" });
}
