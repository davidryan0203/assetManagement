import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Vendor from "@backend/models/Vendor";
import { getUserFromRequest } from "@backend/lib/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const vendors = await Vendor.find({}).sort({ name: 1 });
  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, contactName, email, phone, website, address, notes } = await req.json();
  if (!name) return NextResponse.json({ message: "Vendor name is required" }, { status: 400 });

  const existing = await Vendor.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
  if (existing) return NextResponse.json({ message: "Vendor already exists" }, { status: 409 });

  const vendor = await Vendor.create({ name, contactName, email, phone, website, address, notes });
  return NextResponse.json({ message: "Vendor created", vendor }, { status: 201 });
}
