import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import User from "@backend/models/User";
import "@backend/models/Department"; // ensure model is registered for populate
import "@backend/models/Site";       // ensure model is registered for populate
import { getUserFromRequest } from "@backend/lib/jwt";

// GET all users (admin & manager only)
export async function GET(req: NextRequest) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "manager")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const users = await User.find({})
    .populate("department", "name code")
    .populate("site", "name")
    .select("-password")
    .sort({ createdAt: -1 });
  return NextResponse.json({ users });
}

// POST create user (admin only)
export async function POST(req: NextRequest) {
  await dbConnect();
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

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ message: "Email already in use" }, { status: 409 });
  }

  const user = await User.create({
    firstName, lastName, displayName, employeeId, description,
    email, password, role,
    phone, mobile,
    department: department || null,
    site: site || null,
  });
  return NextResponse.json({ message: "User created", user }, { status: 201 });
}
