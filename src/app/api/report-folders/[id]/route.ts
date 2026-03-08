import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import ReportFolder from "@backend/models/ReportFolder";
import Report from "@backend/models/Report";
import { getUserFromRequest } from "@backend/lib/jwt";

// DELETE a folder (also unlinks reports from it)
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
  await ReportFolder.findByIdAndDelete(id);
  // Unlink any reports in this folder
  await Report.updateMany({ folder: id }, { folder: null });

  return NextResponse.json({ message: "Folder deleted" });
}

// PATCH rename folder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }

  const folder = await ReportFolder.findByIdAndUpdate(
    id,
    { name: name.trim() },
    { new: true }
  );
  return NextResponse.json({ folder });
}
