import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Product from "@backend/models/Product";
import "@backend/models/Category";
import "@backend/models/Vendor";
import { getUserFromRequest } from "@backend/lib/jwt";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const product = await Product.findByIdAndUpdate(
    id,
    { ...body, vendor: body.vendor || null, defaultWarrantyMonths: body.defaultWarrantyMonths || null },
    { new: true, runValidators: true }
  )
    .populate("category", "name")
    .populate("vendor", "name");

  if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

  return NextResponse.json({ message: "Product updated", product });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const product = await Product.findByIdAndDelete(id);
  if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

  return NextResponse.json({ message: "Product deleted" });
}
