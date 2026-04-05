import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeAsset, toPrismaAssetState } from "@backend/lib/mysqlSerializers";
import { canAccessSiteRecord } from "@backend/lib/siteAccess";

// POST /api/assets/[id]/assign
// Assigns (or un-assigns) an asset to a user and/or department.
// Body: { assignedTo, department, associatedToIds, site, retainSite, stateComments }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const assetDoc = await prisma.asset.findUnique({ where: { id }, select: { siteId: true } });
  if (!assetDoc) return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  if (!canAccessSiteRecord(currentUser, assetDoc.siteId)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { assignedTo, department, associatedToIds, site, retainSite, stateComments } = body;
  const normalizedAssociatedToIds = Array.isArray(associatedToIds)
    ? associatedToIds.filter((item: unknown): item is string => typeof item === "string" && item.length > 0)
    : [];

  // If neither user nor department is provided, we are un-assigning
  const newState = assignedTo ? "Assigned" : "In Store";

  // If retainSite is true, keep the site that was auto-resolved from the user;
  // otherwise use whatever site was explicitly provided.
  let resolvedSite = site || null;

  if (assignedTo && retainSite) {
    // Auto-resolve site from the assigned user's site
    const userDoc = await prisma.user.findUnique({ where: { id: assignedTo }, select: { siteId: true } });
    if (userDoc?.siteId) {
      if (!canAccessSiteRecord(currentUser, userDoc.siteId)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      resolvedSite = userDoc.siteId;
    }
  }

  if (resolvedSite && !canAccessSiteRecord(currentUser, resolvedSite)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const data: Prisma.AssetUpdateInput = {
    assignedTo: assignedTo ? { connect: { id: assignedTo } } : { disconnect: true },
    department: department ? { connect: { id: department } } : { disconnect: true },
    site: resolvedSite ? { connect: { id: resolvedSite } } : { disconnect: true },
    retainSite: !!retainSite,
    stateComments: stateComments || "",
    assetState: toPrismaAssetState(newState) as any,
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
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  });

  await prisma.$executeRaw`UPDATE assets SET associatedToIds = CAST(${JSON.stringify(normalizedAssociatedToIds)} AS JSON) WHERE id = ${id}`;

  if (!asset) return NextResponse.json({ message: "Asset not found" }, { status: 404 });

  return NextResponse.json({ message: "Asset assigned", asset: serializeAsset(asset) });
}
