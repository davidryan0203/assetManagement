import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Asset from "@backend/models/Asset";
import User from "@backend/models/User";
import Department from "@backend/models/Department";
import { getUserFromRequest } from "@backend/lib/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
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
    Asset.countDocuments({}),
    Asset.countDocuments({ status: "available" }),
    Asset.countDocuments({ status: "in-use" }),
    Asset.countDocuments({ status: "maintenance" }),
    Asset.countDocuments({ status: "retired" }),
    User.countDocuments({}),
    Department.countDocuments({}),
  ]);

  const recentAssets = await Asset.find({})
    .populate("department", "name")
    .populate("assignedTo", "name")
    .sort({ createdAt: -1 })
    .limit(5);

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
