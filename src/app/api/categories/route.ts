import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeCategory } from "@backend/lib/mysqlSerializers";

export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ categories: categories.map(serializeCategory) });
}

export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });

  const existing = await prisma.category.findFirst({ where: { name } });
  if (existing) return NextResponse.json({ message: "Category already exists" }, { status: 409 });

  try {
    const category = await prisma.category.create({ data: { name, description: description || "" } });
    return NextResponse.json({ message: "Category created", category: serializeCategory(category) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Category already exists" }, { status: 409 });
    }
    throw error;
  }
}
