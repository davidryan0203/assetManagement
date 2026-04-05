import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import { serializeUser } from "@backend/lib/mysqlSerializers";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      department: { select: { id: true, name: true, code: true } },
      site: { select: { id: true, name: true } },
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`.trim(),
    siteId: user.site?.id || null,
  });

  return NextResponse.json({
    message: "Login successful",
    token,
    user: serializeUser(user),
  });
}
