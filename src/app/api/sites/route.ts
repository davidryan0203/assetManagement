import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Site from "@backend/models/Site";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET all sites
export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sites = await Site.find({}).sort({ name: 1 });
  return NextResponse.json({ sites });
}

// POST create site (admin only)
export async function POST(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ message: "Site name is required" }, { status: 400 });
  }

  const existing = await Site.findOne({ name });
  if (existing) {
    return NextResponse.json({ message: "Site name already exists" }, { status: 409 });
  }

  const site = await Site.create(body);
  return NextResponse.json({ message: "Site created", site }, { status: 201 });
}
