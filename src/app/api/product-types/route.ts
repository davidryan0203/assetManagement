import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import ProductType from "@backend/models/ProductType";
import "@backend/models/Category";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET /api/product-types
export async function GET(req: NextRequest) {
  await dbConnect();
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const productTypes = await ProductType.find()
    .populate("category", "name")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({ productTypes });
}

// POST /api/product-types
export async function POST(req: NextRequest) {
  await dbConnect();
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, category, type } = body;

  if (!name || !category || !type) {
    return NextResponse.json({ message: "Name, category and type are required" }, { status: 400 });
  }

  const productType = await ProductType.create({ name, category, type });
  const populated = await productType.populate("category", "name");
  return NextResponse.json({ productType: populated }, { status: 201 });
}
