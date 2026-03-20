import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeProduct } from "@backend/lib/mysqlSerializers";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.manufacturer !== undefined ? { manufacturer: body.manufacturer } : {}),
        ...(body.partNo !== undefined ? { partNo: body.partNo } : {}),
        ...(body.cost !== undefined ? { cost: body.cost || null } : {}),
        ...(body.sku !== undefined ? { sku: body.sku } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.modelNumber !== undefined ? { modelNumber: body.modelNumber } : {}),
        ...(body.defaultWarrantyMonths !== undefined ? { defaultWarrantyMonths: body.defaultWarrantyMonths || null } : {}),
        ...(body.category !== undefined ? { category: { connect: { id: body.category } } } : {}),
        ...(body.vendor !== undefined
          ? body.vendor
            ? { vendor: { connect: { id: body.vendor } } }
            : { vendor: { disconnect: true } }
          : {}),
        ...(body.productType !== undefined
          ? body.productType
            ? { productType: { connect: { id: body.productType } } }
            : { productType: { disconnect: true } }
          : {}),
      },
      include: { category: true, vendor: true, productType: { include: { category: true } } },
    });

    return NextResponse.json({ message: "Product updated", product: serializeProduct(product) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const product = await prisma.product.delete({ where: { id } }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  });

  if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });

  return NextResponse.json({ message: "Product deleted" });
}
