import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Category from "@backend/models/Category";
import { getUserFromRequest } from "@backend/lib/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const categories = await Category.find({}).sort({ name: 1 });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });

  const existing = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
  if (existing) return NextResponse.json({ message: "Category already exists" }, { status: 409 });

  const category = await Category.create({ name, description });
  return NextResponse.json({ message: "Category created", category }, { status: 201 });
}
