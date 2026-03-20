import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeProductType } from "@backend/lib/mysqlSerializers";

// GET /api/product-types
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const productTypes = await prisma.productType.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ productTypes: productTypes.map(serializeProductType) });
}

// POST /api/product-types
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, category, type } = body;

  if (!name || !category || !type) {
    return NextResponse.json({ message: "Name, category and type are required" }, { status: 400 });
  }

  const productType = await prisma.productType.create({
    data: { name, category: { connect: { id: category } }, type },
    include: { category: true },
  });

  return NextResponse.json({ productType: serializeProductType(productType) }, { status: 201 });
}
