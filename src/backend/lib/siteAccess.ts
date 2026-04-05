import { Prisma } from "@prisma/client";
import type { JWTPayload } from "./jwt";

export function getManagerSiteIds(user: JWTPayload | null | undefined): string[] {
  if (!user || user.role !== "manager") return [];

  if (Array.isArray(user.managerSiteIds)) {
    const ids = user.managerSiteIds.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length > 0) return ids;
  }

  return user.siteId ? [user.siteId] : [];
}

export function isManagerInSite(user: JWTPayload | null | undefined) {
  return !!user && user.role === "manager" && getManagerSiteIds(user).length > 0;
}

export function scopeAssetWhereToUser(
  where: Prisma.AssetWhereInput,
  user: JWTPayload | null | undefined
): Prisma.AssetWhereInput {
  if (user?.role === "admin") return where;
  if (user?.role === "manager") {
    const managerSiteIds = getManagerSiteIds(user);
    return { ...where, siteId: { in: managerSiteIds } };
  }
  return where;
}

export function canAccessSiteRecord(user: JWTPayload | null | undefined, siteId?: string | null) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "manager") return !!siteId && getManagerSiteIds(user).includes(siteId);
  return false;
}
