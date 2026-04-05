import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeUser } from "@backend/lib/mysqlSerializers";

function normalizeManagerSiteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

// GET all users (admin & manager only)
export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "manager")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: {
      department: { select: { id: true, name: true, code: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const sites = await prisma.site.findMany({
    select: { id: true, name: true },
  });
  const siteMap = new Map(sites.map((site) => [site.id, site]));

  const serializedUsers = users.map((user) => {
    const managerSiteIds = normalizeManagerSiteIds(user.managerSiteIds);
    const managerSites = managerSiteIds
      .map((id) => siteMap.get(id))
      .filter((site): site is { id: string; name: string } => !!site);

    return serializeUser({
      ...user,
      managerSiteIds,
      managerSites,
    });
  });

  return NextResponse.json({ users: serializedUsers });
}

// POST create user (admin only)
export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, email, password, role, department, site,
      displayName, employeeId, description, phone, mobile, managerSiteIds } = body;

    const normalizedManagerSiteIds = normalizeManagerSiteIds(managerSiteIds);
    const roleValue = role || "staff";
    const primaryManagerSiteId = normalizedManagerSiteIds[0] || null;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ message: "First name, last name, email, and password are required" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        displayName: displayName || "",
        employeeId: employeeId || "",
        description: description || "",
        email: email.toLowerCase(),
        password: passwordHash,
        role: roleValue,
        phone: phone || "",
        mobile: mobile || "",
        managerSiteIds: roleValue === "manager" ? normalizedManagerSiteIds : null,
        department: department ? { connect: { id: department } } : undefined,
        site: roleValue === "manager"
          ? (primaryManagerSiteId ? { connect: { id: primaryManagerSiteId } } : undefined)
          : (site ? { connect: { id: site } } : undefined),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true } },
      },
    });

    const managerSites = normalizedManagerSiteIds.length > 0
      ? await prisma.site.findMany({
          where: { id: { in: normalizedManagerSiteIds } },
          select: { id: true, name: true },
        })
      : [];

    return NextResponse.json({
      message: "User created",
      user: serializeUser({ ...user, managerSiteIds: normalizedManagerSiteIds, managerSites }),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ message: "Email already in use" }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ message: "Department or site not found" }, { status: 400 });
      }
    }
    throw error;
  }
}
