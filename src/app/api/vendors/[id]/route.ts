import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Vendor from "@backend/models/Vendor";
import { getUserFromRequest } from "@backend/lib/jwt";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const vendor = await Vendor.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!vendor) return NextResponse.json({ message: "Vendor not found" }, { status: 404 });

  return NextResponse.json({ message: "Vendor updated", vendor });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const vendor = await Vendor.findByIdAndDelete(id);
  if (!vendor) return NextResponse.json({ message: "Vendor not found" }, { status: 404 });

  return NextResponse.json({ message: "Vendor deleted" });
}
