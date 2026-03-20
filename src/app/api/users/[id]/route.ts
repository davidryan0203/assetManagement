import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeUser } from "@backend/lib/mysqlSerializers";

// GET single user
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      site: { select: { id: true, name: true } },
    },
  });

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  return NextResponse.json({ user: serializeUser(user) });
}

// PUT update user (admin only, or own profile)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const isSelf = currentUser.id === id;
  const isAdmin = currentUser.role === "admin";

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { firstName, lastName, displayName, employeeId, description,
          email, role, department, site, isActive, password,
          phone, mobile } = body;

  const data: Prisma.UserUpdateInput = {};
  if (firstName) data.firstName = firstName;
  if (lastName) data.lastName = lastName;
  if (displayName !== undefined) data.displayName = displayName;
  if (employeeId !== undefined) data.employeeId = employeeId;
  if (description !== undefined) data.description = description;
  if (email) data.email = email.toLowerCase();
  if (phone !== undefined) data.phone = phone;
  if (mobile !== undefined) data.mobile = mobile;
  if (isAdmin && role) data.role = role;
  if (isAdmin && department !== undefined) {
    data.department = department ? { connect: { id: department } } : { disconnect: true };
  }
  if (isAdmin && site !== undefined) {
    data.site = site ? { connect: { id: site } } : { disconnect: true };
  }
  if (isAdmin && isActive !== undefined) data.isActive = isActive;
  if (password) data.password = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ message: "User updated", user: serializeUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json({ message: "Email already in use" }, { status: 409 });
      }
    }
    throw error;
  }
}

// DELETE user (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  if (currentUser.id === id) {
    return NextResponse.json({ message: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return;
    }
    throw error;
  });

  return NextResponse.json({ message: "User deleted" });
}
