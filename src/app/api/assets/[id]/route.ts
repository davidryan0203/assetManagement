import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Asset from "@backend/models/Asset";
import "@backend/models/Product";
import "@backend/models/Category";
import "@backend/models/Vendor";
import "@backend/models/Department";
import "@backend/models/Site";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET single asset
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const asset = await Asset.findById(id)
    .populate({ path: "product", select: "name sku category", populate: { path: "category", select: "name" } })
    .populate("vendor", "name")
    .populate("department", "name code")
    .populate("site", "name")
    .populate("assignedTo", "name email")
    .populate("associatedTo", "name assetTag")
    .populate("createdBy", "name");

  if (!asset) return NextResponse.json({ message: "Asset not found" }, { status: 404 });

  return NextResponse.json({ asset });
}

// PUT update asset (admin & manager)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const asset = await Asset.findByIdAndUpdate(
    id,
    {
      ...body,
      vendor: body.vendor || null,
      department: body.department || null,
      site: body.site || null,
      assignedTo: body.assignedTo || null,
      associatedTo: body.associatedTo || null,
      acquisitionDate: body.acquisitionDate || null,
      expiryDate: body.expiryDate || null,
      warrantyExpiryDate: body.warrantyExpiryDate || null,
      lastSeen: body.lastSeen || null,
    },
    { new: true, runValidators: true }
  )
    .populate({ path: "product", select: "name sku category", populate: { path: "category", select: "name" } })
    .populate("vendor", "name")
    .populate("department", "name code")
    .populate("site", "name")
    .populate("assignedTo", "name email");

  if (!asset) return NextResponse.json({ message: "Asset not found" }, { status: 404 });

  return NextResponse.json({ message: "Asset updated", asset });
}

// DELETE asset (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await Asset.findByIdAndDelete(id);
  return NextResponse.json({ message: "Asset deleted" });
}
