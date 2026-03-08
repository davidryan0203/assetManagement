import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Department from "@backend/models/Department";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET single department
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const dept = await Department.findById(id);
  if (!dept) return NextResponse.json({ message: "Department not found" }, { status: 404 });

  return NextResponse.json({ department: dept });
}

// PUT update department (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const { name, description, code, isActive } = body;

  const dept = await Department.findByIdAndUpdate(
    id,
    { name, description, code, isActive },
    { new: true, runValidators: true }
  );

  if (!dept) return NextResponse.json({ message: "Department not found" }, { status: 404 });

  return NextResponse.json({ message: "Department updated", department: dept });
}

// DELETE department (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await Department.findByIdAndDelete(id);
  return NextResponse.json({ message: "Department deleted" });
}
