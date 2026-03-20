import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeDepartment } from "@backend/lib/mysqlSerializers";

// GET single department
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) return NextResponse.json({ message: "Department not found" }, { status: 404 });

  return NextResponse.json({
    department: {
      ...serializeDepartment(dept),
      description: dept.description || "",
      isActive: dept.isActive,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
    },
  });
}

// PUT update department (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const { name, description, code, isActive } = body;

  try {
    const dept = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(code !== undefined ? { code: String(code).toUpperCase() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({
      message: "Department updated",
      department: {
        ...serializeDepartment(dept),
        description: dept.description || "",
        isActive: dept.isActive,
        createdAt: dept.createdAt,
        updatedAt: dept.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ message: "Department not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json({ message: "Department name or code already exists" }, { status: 409 });
      }
    }
    throw error;
  }
}

// DELETE department (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await prisma.department.delete({ where: { id } }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return;
    }
    throw error;
  });

  return NextResponse.json({ message: "Department deleted" });
}
