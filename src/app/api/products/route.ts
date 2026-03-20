import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeProduct } from "@backend/lib/mysqlSerializers";

export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const products = await prisma.product.findMany({
    where: category ? { categoryId: category } : {},
    include: { category: true, vendor: true, productType: { include: { category: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ products: products.map(serializeProduct) });
}

export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, productType, manufacturer, partNo, cost, sku, category, vendor, description, modelNumber, defaultWarrantyMonths } = await req.json();
  if (!name || !category) {
    return NextResponse.json({ message: "Name and category are required" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      manufacturer: manufacturer || "",
      partNo: partNo || "",
      cost: cost ?? null,
      sku: sku || "",
      description: description || "",
      modelNumber: modelNumber || "",
      defaultWarrantyMonths: defaultWarrantyMonths ?? null,
      category: { connect: { id: category } },
      ...(vendor ? { vendor: { connect: { id: vendor } } } : {}),
      ...(productType ? { productType: { connect: { id: productType } } } : {}),
    },
    include: { category: true, vendor: true, productType: { include: { category: true } } },
  });

  return NextResponse.json({ message: "Product created", product: serializeProduct(product) }, { status: 201 });
}
