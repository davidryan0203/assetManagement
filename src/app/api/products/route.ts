import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Product from "@backend/models/Product";
import "@backend/models/Category";
import "@backend/models/Vendor";
import "@backend/models/ProductType";
import { getUserFromRequest } from "@backend/lib/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const query: Record<string, unknown> = {};
  if (category) query.category = category;

  const products = await Product.find(query)
    .populate("category", "name")
    .populate("vendor", "name")
    .populate("productType", "name type")
    .sort({ name: 1 });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, productType, manufacturer, partNo, cost, sku, category, vendor, description, modelNumber, defaultWarrantyMonths } = await req.json();
  if (!name || !category) {
    return NextResponse.json({ message: "Name and category are required" }, { status: 400 });
  }

  const product = await Product.create({
    name, productType: productType || null, manufacturer, partNo, cost: cost || null,
    sku, category, vendor: vendor || null,
    description, modelNumber,
    defaultWarrantyMonths: defaultWarrantyMonths || null,
  });

  const populated = await product.populate([
    { path: "category", select: "name" },
    { path: "vendor", select: "name" },
    { path: "productType", select: "name type" },
  ]);

  return NextResponse.json({ message: "Product created", product: populated }, { status: 201 });
}
