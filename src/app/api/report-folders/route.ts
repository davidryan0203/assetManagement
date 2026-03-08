import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import ReportFolder from "@backend/models/ReportFolder";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET all folders
export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const folders = await ReportFolder.find()
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  return NextResponse.json({ folders });
}

// POST create folder
export async function POST(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ message: "Folder name is required" }, { status: 400 });
  }

  const folder = await ReportFolder.create({ name: name.trim(), createdBy: currentUser.id });
  return NextResponse.json({ folder }, { status: 201 });
}
