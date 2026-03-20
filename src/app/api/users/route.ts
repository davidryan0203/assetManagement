import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeUser } from "@backend/lib/mysqlSerializers";

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

  return NextResponse.json({ users: users.map(serializeUser) });
}

// POST create user (admin only)
export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, email, password, role, department, site,
          displayName, employeeId, description, phone, mobile } = body;

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
        role: role || "staff",
        phone: phone || "",
        mobile: mobile || "",
        department: department ? { connect: { id: department } } : undefined,
        site: site ? { connect: { id: site } } : undefined,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ message: "User created", user: serializeUser(user) }, { status: 201 });
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
