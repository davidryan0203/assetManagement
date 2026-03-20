import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@backend/lib/prisma";
import { serializeUser } from "@backend/lib/mysqlSerializers";

const DEFAULT_DEPARTMENTS = [
  { name: "Programs", code: "PROG", description: "Programs department" },
  { name: "Finance", code: "FIN", description: "Finance department" },
  { name: "Student", code: "STU", description: "Student services department" },
  { name: "Operations", code: "OPS", description: "Operations department" },
  { name: "Technology", code: "TECH", description: "Technology department" },
];

export async function POST() {
  // Seed default departments
  for (const dept of DEFAULT_DEPARTMENTS) {
    const exists = await prisma.department.findFirst({ where: { code: dept.code } });
    if (!exists) {
      await prisma.department.create({ data: dept });
    }
  }

  // Seed admin user
  const existing = await prisma.user.findUnique({ where: { email: "admin@inventory.com" } });
  if (existing) {
    return NextResponse.json({ message: "Admin already exists. Default departments have been seeded." }, { status: 200 });
  }

  const admin = await prisma.user.create({
    data: {
    firstName: "Super",
    lastName: "Admin",
    displayName: "Super Admin",
    email: "admin@inventory.com",
    password: await bcrypt.hash("Admin@123", 12),
    role: "admin",
    isActive: true,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      site: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    message: "Admin created and default departments seeded",
    credentials: { email: "admin@inventory.com", password: "Admin@123" },
    user: serializeUser(admin),
    departments: DEFAULT_DEPARTMENTS.map((d) => d.name),
  });
}
