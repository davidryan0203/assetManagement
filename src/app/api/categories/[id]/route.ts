import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Category from "@backend/models/Category";
import { getUserFromRequest } from "@backend/lib/jwt";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const category = await Category.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!category) return NextResponse.json({ message: "Category not found" }, { status: 404 });

  return NextResponse.json({ message: "Category updated", category });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const category = await Category.findByIdAndDelete(id);
  if (!category) return NextResponse.json({ message: "Category not found" }, { status: 404 });

  return NextResponse.json({ message: "Category deleted" });
}
