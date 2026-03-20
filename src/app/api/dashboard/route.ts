import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeAsset } from "@backend/lib/mysqlSerializers";

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
    prisma.asset.count(),
    prisma.asset.count({ where: { assetState: "InStore" } }),
    prisma.asset.count({ where: { assetState: "Assigned" } }),
    prisma.asset.count({ where: { assetState: "UnderRepair" } }),
    prisma.asset.count({ where: { assetState: "Retired" } }),
    prisma.user.count(),
    prisma.department.count(),
  ]);

  const recentAssetsDb = await prisma.asset.findMany({
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
