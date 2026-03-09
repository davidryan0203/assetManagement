import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import ProductType from "@backend/models/ProductType";
import "@backend/models/Category";
import { getUserFromRequest } from "@backend/lib/jwt";

// PUT /api/product-types/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const productType = await ProductType.findByIdAndUpdate(id, body, { new: true }).populate("category", "name");
  if (!productType) return NextResponse.json({ message: "Product type not found" }, { status: 404 });

  return NextResponse.json({ productType });
}

// DELETE /api/product-types/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const deleted = await ProductType.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ message: "Product type not found" }, { status: 404 });

  return NextResponse.json({ message: "Product type deleted" });
}
