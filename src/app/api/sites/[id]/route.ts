import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Site from "@backend/models/Site";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET single site
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const site = await Site.findById(id);
  if (!site) return NextResponse.json({ message: "Site not found" }, { status: 404 });
  return NextResponse.json({ site });
}

// PUT update site (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const site = await Site.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!site) return NextResponse.json({ message: "Site not found" }, { status: 404 });
  return NextResponse.json({ message: "Site updated", site });
}

// DELETE site (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await Site.findByIdAndDelete(id);
  return NextResponse.json({ message: "Site deleted" });
}
