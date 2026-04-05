import { Prisma } from "@prisma/client";
import type { JWTPayload } from "./jwt";

export function isManagerInSite(user: JWTPayload | null | undefined) {
  return !!user && user.role === "manager" && !!user.siteId;
}

export function scopeAssetWhereToUser(
  where: Prisma.AssetWhereInput,
  user: JWTPayload | null | undefined
): Prisma.AssetWhereInput {
  if (user?.role === "admin") return where;
  if (isManagerInSite(user)) {
    return { ...where, siteId: user!.siteId as string };
  }
  return where;
}

export function canAccessSiteRecord(user: JWTPayload | null | undefined, siteId?: string | null) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "manager") return !!user.siteId && !!siteId && user.siteId === siteId;
  return false;
}
