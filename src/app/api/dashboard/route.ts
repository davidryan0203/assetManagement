import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeAsset } from "@backend/lib/mysqlSerializers";
import { getManagerSiteIds, scopeAssetWhereToUser } from "@backend/lib/siteAccess";

export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const managerSiteIds = getManagerSiteIds(currentUser);
  const managerScope = currentUser.role === "manager" && managerSiteIds.length > 0
    ? { in: managerSiteIds }
    : null;
  const assetOnlyWhere = scopeAssetWhereToUser(
    { product: { productType: { type: "Asset" } } },
    currentUser,
  );

  const [
    totalAssets,
    availableAssets,
    inUseAssets,
    maintenanceAssets,
    retiredAssets,
    totalUsers,
    totalDepartments,
  ] = await Promise.all([
    prisma.asset.count({ where: assetOnlyWhere }),
    prisma.asset.count({ where: scopeAssetWhereToUser({ product: { productType: { type: "Asset" } }, assetState: "InStore" }, currentUser) }),
    prisma.asset.count({ where: scopeAssetWhereToUser({ product: { productType: { type: "Asset" } }, assetState: "Assigned" }, currentUser) }),
    prisma.asset.count({ where: scopeAssetWhereToUser({ product: { productType: { type: "Asset" } }, assetState: "UnderRepair" }, currentUser) }),
    prisma.asset.count({ where: scopeAssetWhereToUser({ product: { productType: { type: "Asset" } }, assetState: "Retired" }, currentUser) }),
    managerScope
      ? prisma.user.count({ where: { siteId: managerScope } })
      : prisma.user.count(),
    managerScope
      ? prisma.department.count({ where: { users: { some: { siteId: managerScope } } } })
      : prisma.department.count(),
  ]);

  const assetsDb = await prisma.asset.findMany({
    where: assetOnlyWhere,
    include: {
      product: { include: { category: true, productType: true } },
      department: true,
      site: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const recentAssetsDb = assetsDb.slice(0, 5);

  const recentAssets = recentAssetsDb.map((asset) => {
    const a = serializeAsset(asset);
    return {
      _id: a._id,
      name: a.name,
      assetTag: a.assetTag,
      category: a.product?.category?.name || "",
      status:
        a.assetState === "In Store"
          ? "available"
          : a.assetState === "Assigned"
            ? "in-use"
            : a.assetState === "Under Repair"
              ? "maintenance"
              : a.assetState === "Retired"
                ? "retired"
                : "available",
      department: a.department,
      assignedTo: a.assignedTo,
      createdAt: a.createdAt,
    };
  });

  const assets = assetsDb.map((asset) => {
    const a = serializeAsset(asset);
    return {
      _id: a._id,
      name: a.name,
      assetTag: a.assetTag,
      assetState: a.assetState,
      expiryDate: a.expiryDate,
      warrantyExpiryDate: a.warrantyExpiryDate,
      product: a.product,
      department: a.department,
      site: a.site,
      assignedTo: a.assignedTo,
      stateComments: a.stateComments,
    };
  });

  return NextResponse.json({
    stats: {
      totalAssets,
      availableAssets,
      inUseAssets,
      maintenanceAssets,
      retiredAssets,
      totalUsers,
      totalDepartments,
    },
    assets,
    recentAssets,
  });
}
