import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeUser } from "@backend/lib/mysqlSerializers";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      site: { select: { id: true, name: true } },
    },
  });

  if (!dbUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const managerSiteIds = Array.isArray(dbUser.managerSiteIds)
    ? dbUser.managerSiteIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  const managerSites = managerSiteIds.length > 0
    ? await prisma.site.findMany({
        where: { id: { in: managerSiteIds } },
        select: { id: true, name: true },
      })
    : [];

  return NextResponse.json({ user: serializeUser({ ...dbUser, managerSiteIds, managerSites }) });
}
