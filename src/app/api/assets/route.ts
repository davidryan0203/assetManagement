import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeAsset, toPrismaAssetState } from "@backend/lib/mysqlSerializers";

// GET all assets
export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assetState = searchParams.get("assetState");
  const category = searchParams.get("category");
  const department = searchParams.get("department");
  const search = searchParams.get("search");

  const where: Prisma.AssetWhereInput = {
    ...(assetState ? { assetState: toPrismaAssetState(assetState) as Prisma.AssetScalarWhereInput["assetState"] } : {}),
    ...(department ? { departmentId: department } : {}),
    ...(category ? { product: { categoryId: category } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { assetTag: { contains: search } },
            { serialNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const assets = await prisma.asset.findMany({
    where,
    include: {
      product: { include: { category: true, vendor: true, productType: { include: { category: true } } } },
      vendor: true,
      department: true,
      site: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      associatedTo: { select: { id: true, name: true, assetTag: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assets: assets.map(serializeAsset) });
}

// POST create asset (admin & manager)
export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, assetTag, product } = body;

  if (!name || !assetTag || !product) {
    return NextResponse.json({ message: "Name, asset tag, and product are required" }, { status: 400 });
  }

  const existing = await prisma.asset.findUnique({ where: { assetTag: assetTag.toUpperCase() } });
  if (existing) {
    return NextResponse.json({ message: "Asset tag already exists" }, { status: 409 });
  }

  const asset = await prisma.asset.create({
    data: {
      name: body.name,
      assetTag: assetTag.toUpperCase(),
      serialNumber: body.serialNumber || "",
      purchaseCost: body.purchaseCost ?? null,
      acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      warrantyExpiryDate: body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : null,
      barcodeQr: body.barcodeQr || "",
      location: body.location || "",
      assetState: toPrismaAssetState(body.assetState || "In Store") as any,
      retainSite: !!body.retainSite,
      stateComments: body.stateComments || "",
      isNewDevice: body.isNewDevice ?? true,
      assetCheck: body.assetCheck || "",
      comment: body.comment || "",
      comment2: body.comment2 || "",
      conditionTag: body.conditionTag || "",
      grade: body.grade || "",
      cell: body.cell || "",
      devicePurchase: body.devicePurchase || "",
      lastSeen: body.lastSeen ? new Date(body.lastSeen) : null,
      numAuthDevices: body.numAuthDevices ?? null,
      product: { connect: { id: body.product } },
      ...(body.vendor ? { vendor: { connect: { id: body.vendor } } } : {}),
      ...(body.department ? { department: { connect: { id: body.department } } } : {}),
      ...(body.site ? { site: { connect: { id: body.site } } } : {}),
      ...(body.assignedTo ? { assignedTo: { connect: { id: body.assignedTo } } } : {}),
      ...(body.associatedTo ? { associatedTo: { connect: { id: body.associatedTo } } } : {}),
      createdBy: { connect: { id: currentUser.id } },
    },
    include: {
      product: { include: { category: true, vendor: true, productType: { include: { category: true } } } },
      vendor: true,
      department: true,
      site: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      associatedTo: { select: { id: true, name: true, assetTag: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ message: "Asset created", asset: serializeAsset(asset) }, { status: 201 });
}
