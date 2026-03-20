import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeProductType } from "@backend/lib/mysqlSerializers";

// PUT /api/product-types/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  try {
    const productType = await prisma.productType.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.category !== undefined
          ? body.category
            ? { category: { connect: { id: body.category } } }
            : {}
          : {}),
      },
      include: { category: true },
    });

    return NextResponse.json({ productType: serializeProductType(productType) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Product type not found" }, { status: 404 });
    }
    throw error;
  }
}

// DELETE /api/product-types/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const deleted = await prisma.productType.delete({ where: { id } }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  });

  if (!deleted) return NextResponse.json({ message: "Product type not found" }, { status: 404 });

  return NextResponse.json({ message: "Product type deleted" });
}
