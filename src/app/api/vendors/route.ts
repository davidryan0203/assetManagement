import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeVendor } from "@backend/lib/mysqlSerializers";

export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ vendors: vendors.map(serializeVendor) });
}

export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, contactName, email, phone, website, address, notes } = await req.json();
  if (!name) return NextResponse.json({ message: "Vendor name is required" }, { status: 400 });

  const existing = await prisma.vendor.findFirst({ where: { name } });
  if (existing) return NextResponse.json({ message: "Vendor already exists" }, { status: 409 });

  try {
    const vendor = await prisma.vendor.create({
      data: {
        name,
        contactName: contactName || "",
        email: email || "",
        phone: phone || "",
        website: website || "",
        address: address || "",
        notes: notes || "",
      },
    });
    return NextResponse.json({ message: "Vendor created", vendor: serializeVendor(vendor) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Vendor already exists" }, { status: 409 });
    }
    throw error;
  }
}
