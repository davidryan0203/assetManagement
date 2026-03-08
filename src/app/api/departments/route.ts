import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Department from "@backend/models/Department";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET all departments
export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const departments = await Department.find({}).sort({ name: 1 });
  return NextResponse.json({ departments });
}

// POST create department (admin only)
export async function POST(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, code } = body;

  if (!name || !code) {
    return NextResponse.json({ message: "Name and code are required" }, { status: 400 });
  }

  const existing = await Department.findOne({ $or: [{ name }, { code: code.toUpperCase() }] });
  if (existing) {
    return NextResponse.json({ message: "Department name or code already exists" }, { status: 409 });
  }

  const department = await Department.create({ name, description, code });
  return NextResponse.json({ message: "Department created", department }, { status: 201 });
}
