import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeAsset, toPrismaAssetState } from "@backend/lib/mysqlSerializers";

// POST /api/assets/[id]/assign
// Assigns (or un-assigns) an asset to a user and/or department.
// Body: { assignedTo, department, associatedTo, site, retainSite, stateComments }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { assignedTo, department, associatedTo, site, retainSite, stateComments } = body;

  // If neither user nor department is provided, we are un-assigning
  const newState = assignedTo ? "Assigned" : "In Store";

  // If retainSite is true, keep the site that was auto-resolved from the user;
  // otherwise use whatever site was explicitly provided.
  let resolvedSite = site || null;

  if (assignedTo && retainSite) {
    // Auto-resolve site from the assigned user's site
    const userDoc = await prisma.user.findUnique({ where: { id: assignedTo }, select: { siteId: true } });
    if (userDoc?.siteId) {
      resolvedSite = userDoc.siteId;
    }
  }

  const data: Prisma.AssetUpdateInput = {
    assignedTo: assignedTo ? { connect: { id: assignedTo } } : { disconnect: true },
    department: department ? { connect: { id: department } } : { disconnect: true },
    associatedTo: associatedTo ? { connect: { id: associatedTo } } : { disconnect: true },
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
      associatedTo: { select: { id: true, name: true, assetTag: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  });

  if (!asset) return NextResponse.json({ message: "Asset not found" }, { status: 404 });

  return NextResponse.json({ message: "Asset assigned", asset: serializeAsset(asset) });
}
