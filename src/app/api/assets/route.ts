import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Asset from "@backend/models/Asset";
import "@backend/models/Product";
import "@backend/models/Category";
import "@backend/models/Vendor";
import "@backend/models/Department";
import "@backend/models/Site";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET all assets
export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assetState = searchParams.get("assetState");
  const category = searchParams.get("category");
  const department = searchParams.get("department");
  const search = searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (assetState) query.assetState = assetState;
  if (department) query.department = department;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { assetTag: { $regex: search, $options: "i" } },
      { serialNumber: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by category via product lookup — handled post-fetch for simplicity
  let assets = await Asset.find(query)
    .populate({ path: "product", select: "name sku category", populate: { path: "category", select: "name" } })
    .populate("vendor", "name")
    .populate("department", "name code")
    .populate("site", "name")
    .populate("assignedTo", "name email")
    .populate("associatedTo", "name assetTag")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 });

  if (category) {
    assets = assets.filter(
      (a) => (a.product as any)?.category?._id?.toString() === category
    );
  }

  return NextResponse.json({ assets });
}

// POST create asset (admin & manager)
export async function POST(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, assetTag, product } = body;

  if (!name || !assetTag || !product) {
    return NextResponse.json({ message: "Name, asset tag, and product are required" }, { status: 400 });
  }

  const existing = await Asset.findOne({ assetTag: assetTag.toUpperCase() });
  if (existing) {
    return NextResponse.json({ message: "Asset tag already exists" }, { status: 409 });
  }

  const asset = await Asset.create({
    ...body,
    assetTag: assetTag.toUpperCase(),
    vendor: body.vendor || null,
    department: body.department || null,
    site: body.site || null,
    assignedTo: body.assignedTo || null,
    associatedTo: body.associatedTo || null,
    acquisitionDate: body.acquisitionDate || null,
    expiryDate: body.expiryDate || null,
    warrantyExpiryDate: body.warrantyExpiryDate || null,
    lastSeen: body.lastSeen || null,
    createdBy: currentUser.id,
  });

  const populated = await asset.populate([
    { path: "product", select: "name sku category", populate: { path: "category", select: "name" } },
    { path: "vendor", select: "name" },
    { path: "department", select: "name code" },
    { path: "site", select: "name" },
    { path: "assignedTo", select: "name email" },
  ]);

  return NextResponse.json({ message: "Asset created", asset: populated }, { status: 201 });
}
