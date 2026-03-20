import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeDepartment } from "@backend/lib/mysqlSerializers";

// GET all departments
export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({
    departments: departments.map((department) => ({
      ...serializeDepartment(department),
      description: department.description || "",
      isActive: department.isActive,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    })),
  });
}

// POST create department (admin only)
export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, code } = body;

  if (!name || !code) {
    return NextResponse.json({ message: "Name and code are required" }, { status: 400 });
  }

  const existing = await prisma.department.findFirst({
    where: {
      OR: [{ name }, { code: code.toUpperCase() }],
    },
  });

  if (existing) {
    return NextResponse.json({ message: "Department name or code already exists" }, { status: 409 });
  }

  try {
    const department = await prisma.department.create({
      data: {
        name,
        description: description || "",
        code: code.toUpperCase(),
      },
    });

    return NextResponse.json({
      message: "Department created",
      department: {
        ...serializeDepartment(department),
        description: department.description || "",
        isActive: department.isActive,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Department name or code already exists" }, { status: 409 });
    }
    throw error;
  }
}
