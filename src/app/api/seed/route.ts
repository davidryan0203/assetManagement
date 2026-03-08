import { NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import User from "@backend/models/User";
import Department from "@backend/models/Department";

const DEFAULT_DEPARTMENTS = [
  { name: "Programs", code: "PROG", description: "Programs department" },
  { name: "Finance", code: "FIN", description: "Finance department" },
  { name: "Student", code: "STU", description: "Student services department" },
  { name: "Operations", code: "OPS", description: "Operations department" },
  { name: "Technology", code: "TECH", description: "Technology department" },
];

export async function POST() {
  await dbConnect();

  // Seed default departments
  for (const dept of DEFAULT_DEPARTMENTS) {
    const exists = await Department.findOne({ code: dept.code });
    if (!exists) {
      await Department.create(dept);
    }
  }

  // Seed admin user
  const existing = await User.findOne({ email: "admin@inventory.com" });
  if (existing) {
    return NextResponse.json({ message: "Admin already exists. Default departments have been seeded." }, { status: 200 });
  }

  const admin = await User.create({
    firstName: "Super",
    lastName: "Admin",
    displayName: "Super Admin",
    email: "admin@inventory.com",
    password: "Admin@123",
    role: "admin",
    isActive: true,
  });

  return NextResponse.json({
    message: "Admin created and default departments seeded",
    credentials: { email: "admin@inventory.com", password: "Admin@123" },
    user: { id: admin._id, name: `${admin.firstName} ${admin.lastName}`.trim(), email: admin.email, role: admin.role },
    departments: DEFAULT_DEPARTMENTS.map((d) => d.name),
  });
}
