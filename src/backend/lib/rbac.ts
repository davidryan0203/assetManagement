import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "./jwt";

export type Role = "admin" | "manager" | "staff";

export const ROLES: Record<Role, number> = {
  admin: 3,
  manager: 2,
  staff: 1,
};

export function withAuth(
  handler: (req: NextRequest, user: ReturnType<typeof getUserFromRequest>) => Promise<NextResponse>,
  requiredRole?: Role
) {
  return async (req: NextRequest) => {
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized: No token provided" }, { status: 401 });
    }

    if (requiredRole && ROLES[user.role as Role] < ROLES[requiredRole]) {
      return NextResponse.json(
        { message: "Forbidden: Insufficient permissions" },
        { status: 403 }
      );
    }

    return handler(req, user);
  };
}
