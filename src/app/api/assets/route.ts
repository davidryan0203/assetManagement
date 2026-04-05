import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeAsset, toPrismaAssetState } from "@backend/lib/mysqlSerializers";
import { scopeAssetWhereToUser } from "@backend/lib/siteAccess";

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

  const scopedWhere = scopeAssetWhereToUser(where, currentUser);

  const assets = await prisma.asset.findMany({
    where: scopedWhere,
    include: {
      product: { include: { category: true, vendor: true, productType: { include: { category: true } } } },
      vendor: true,
      department: true,
      site: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
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
  const associatedToIds = Array.isArray(body.associatedToIds)
    ? body.associatedToIds.filter((item: unknown): item is string => typeof item === "string" && item.length > 0)
    : [];

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
      ...(currentUser.role === "manager" && currentUser.siteId
        ? { site: { connect: { id: currentUser.siteId } } }
        : body.site ? { site: { connect: { id: body.site } } } : {}),
      ...(body.assignedTo ? { assignedTo: { connect: { id: body.assignedTo } } } : {}),
      createdBy: { connect: { id: currentUser.id } },
    },
    include: {
      product: { include: { category: true, vendor: true, productType: { include: { category: true } } } },
      vendor: true,
      department: true,
      site: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (associatedToIds.length > 0) {
    await prisma.$executeRaw`UPDATE assets SET associatedToIds = CAST(${JSON.stringify(associatedToIds)} AS JSON) WHERE id = ${asset.id}`;
  }

  return NextResponse.json({ message: "Asset created", asset: serializeAsset(asset) }, { status: 201 });
}
