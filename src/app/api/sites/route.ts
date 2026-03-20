import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeSite } from "@backend/lib/mysqlSerializers";

// GET all sites
export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sites = await prisma.site.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ sites: sites.map(serializeSite) });
}

// POST create site (admin only)
export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ message: "Site name is required" }, { status: 400 });
  }

  const existing = await prisma.site.findFirst({ where: { name } });
  if (existing) {
    return NextResponse.json({ message: "Site name already exists" }, { status: 409 });
  }

  try {
    const site = await prisma.site.create({
      data: {
        name,
        description: body.description || "",
        region: body.region || "",
        timeZone: body.timeZone || "",
        language: body.language || "",
        doorNumber: body.doorNumber || "",
        street: body.street || "",
        landmark: body.landmark || "",
        city: body.city || "",
        stateProvince: body.stateProvince || "",
        zipPostalCode: body.zipPostalCode || "",
        country: body.country || "USA",
        email: body.email || "",
        phoneNo: body.phoneNo || "",
        faxNo: body.faxNo || "",
        webUrl: body.webUrl || "",
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json({ message: "Site created", site: serializeSite(site) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Site name already exists" }, { status: 409 });
    }
    throw error;
  }
}
