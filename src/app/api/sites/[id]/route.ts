import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeSite } from "@backend/lib/mysqlSerializers";

// GET single site
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return NextResponse.json({ message: "Site not found" }, { status: 404 });
  return NextResponse.json({ site: serializeSite(site) });
}

// PUT update site (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  try {
    const site = await prisma.site.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.region !== undefined ? { region: body.region } : {}),
        ...(body.timeZone !== undefined ? { timeZone: body.timeZone } : {}),
        ...(body.language !== undefined ? { language: body.language } : {}),
        ...(body.doorNumber !== undefined ? { doorNumber: body.doorNumber } : {}),
        ...(body.street !== undefined ? { street: body.street } : {}),
        ...(body.landmark !== undefined ? { landmark: body.landmark } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.stateProvince !== undefined ? { stateProvince: body.stateProvince } : {}),
        ...(body.zipPostalCode !== undefined ? { zipPostalCode: body.zipPostalCode } : {}),
        ...(body.country !== undefined ? { country: body.country } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phoneNo !== undefined ? { phoneNo: body.phoneNo } : {}),
        ...(body.faxNo !== undefined ? { faxNo: body.faxNo } : {}),
        ...(body.webUrl !== undefined ? { webUrl: body.webUrl } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json({ message: "Site updated", site: serializeSite(site) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ message: "Site not found" }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ message: "Site name already exists" }, { status: 409 });
    }
    throw error;
  }
}

// DELETE site (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await prisma.site.delete({ where: { id } }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return;
    }
    throw error;
  });

  return NextResponse.json({ message: "Site deleted" });
}
