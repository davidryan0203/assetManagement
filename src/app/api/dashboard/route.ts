import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeAsset } from "@backend/lib/mysqlSerializers";
import { scopeAssetWhereToUser } from "@backend/lib/siteAccess";

export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [
    totalAssets,
    availableAssets,
    inUseAssets,
    maintenanceAssets,
    retiredAssets,
    totalUsers,
    totalDepartments,
  ] = await Promise.all([
    prisma.asset.count({ where: scopeAssetWhereToUser({}, currentUser) }),
    prisma.asset.count({ where: scopeAssetWhereToUser({ assetState: "InStore" }, currentUser) }),
    prisma.asset.count({ where: scopeAssetWhereToUser({ assetState: "Assigned" }, currentUser) }),
    prisma.asset.count({ where: scopeAssetWhereToUser({ assetState: "UnderRepair" }, currentUser) }),
    prisma.asset.count({ where: scopeAssetWhereToUser({ assetState: "Retired" }, currentUser) }),
    currentUser.role === "manager" && currentUser.siteId
      ? prisma.user.count({ where: { siteId: currentUser.siteId } })
      : prisma.user.count(),
    currentUser.role === "manager" && currentUser.siteId
      ? prisma.department.count({ where: { users: { some: { siteId: currentUser.siteId } } } })
      : prisma.department.count(),
  ]);

  const recentAssetsDb = await prisma.asset.findMany({
    where: scopeAssetWhereToUser({}, currentUser),
    include: {
      product: { include: { category: true } },
      department: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

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
    recentAssets,
  });
}
