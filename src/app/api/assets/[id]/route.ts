import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeAsset, toPrismaAssetState } from "@backend/lib/mysqlSerializers";

// GET single asset
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
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

  if (!asset) return NextResponse.json({ message: "Asset not found" }, { status: 404 });

  return NextResponse.json({ asset: serializeAsset(asset) });
}

// PUT update asset (admin & manager)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  try {
    const data: Prisma.AssetUpdateInput = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.assetTag !== undefined ? { assetTag: String(body.assetTag).toUpperCase() } : {}),
      ...(body.serialNumber !== undefined ? { serialNumber: body.serialNumber } : {}),
      ...(body.purchaseCost !== undefined ? { purchaseCost: body.purchaseCost || null } : {}),
      ...(body.acquisitionDate !== undefined ? { acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : null } : {}),
      ...(body.expiryDate !== undefined ? { expiryDate: body.expiryDate ? new Date(body.expiryDate) : null } : {}),
      ...(body.warrantyExpiryDate !== undefined ? { warrantyExpiryDate: body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : null } : {}),
      ...(body.barcodeQr !== undefined ? { barcodeQr: body.barcodeQr } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.assetState !== undefined ? { assetState: toPrismaAssetState(body.assetState) as any } : {}),
      ...(body.retainSite !== undefined ? { retainSite: !!body.retainSite } : {}),
      ...(body.stateComments !== undefined ? { stateComments: body.stateComments } : {}),
      ...(body.isNewDevice !== undefined ? { isNewDevice: body.isNewDevice } : {}),
      ...(body.assetCheck !== undefined ? { assetCheck: body.assetCheck } : {}),
      ...(body.comment !== undefined ? { comment: body.comment } : {}),
      ...(body.comment2 !== undefined ? { comment2: body.comment2 } : {}),
      ...(body.conditionTag !== undefined ? { conditionTag: body.conditionTag } : {}),
      ...(body.grade !== undefined ? { grade: body.grade } : {}),
      ...(body.cell !== undefined ? { cell: body.cell } : {}),
      ...(body.devicePurchase !== undefined ? { devicePurchase: body.devicePurchase } : {}),
      ...(body.lastSeen !== undefined ? { lastSeen: body.lastSeen ? new Date(body.lastSeen) : null } : {}),
      ...(body.numAuthDevices !== undefined ? { numAuthDevices: body.numAuthDevices || null } : {}),
      ...(body.product !== undefined ? { product: { connect: { id: body.product } } } : {}),
      ...(body.vendor !== undefined ? (body.vendor ? { vendor: { connect: { id: body.vendor } } } : { vendor: { disconnect: true } }) : {}),
      ...(body.department !== undefined ? (body.department ? { department: { connect: { id: body.department } } } : { department: { disconnect: true } }) : {}),
      ...(body.site !== undefined ? (body.site ? { site: { connect: { id: body.site } } } : { site: { disconnect: true } }) : {}),
      ...(body.assignedTo !== undefined ? (body.assignedTo ? { assignedTo: { connect: { id: body.assignedTo } } } : { assignedTo: { disconnect: true } }) : {}),
      ...(body.associatedTo !== undefined ? (body.associatedTo ? { associatedTo: { connect: { id: body.associatedTo } } } : { associatedTo: { disconnect: true } }) : {}),
    };

    const asset = await prisma.asset.update({
      where: { id },
      data,
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

    return NextResponse.json({ message: "Asset updated", asset: serializeAsset(asset) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }
    throw error;
  }
}

// DELETE asset (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await prisma.asset.delete({ where: { id } }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return;
    }
    throw error;
  });

  return NextResponse.json({ message: "Asset deleted" });
}
