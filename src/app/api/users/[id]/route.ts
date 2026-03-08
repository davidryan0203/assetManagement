import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import User from "@backend/models/User";
import "@backend/models/Department"; // ensure model is registered for populate
import "@backend/models/Site";       // ensure model is registered for populate
import { getUserFromRequest } from "@backend/lib/jwt";

// GET single user
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const user = await User.findById(id).populate("department", "name code").select("-password");
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}

// PUT update user (admin only, or own profile)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
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

  const updateData: Record<string, unknown> = {};
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (displayName !== undefined) updateData.displayName = displayName;
  if (employeeId !== undefined) updateData.employeeId = employeeId;
  if (description !== undefined) updateData.description = description;
  if (email) updateData.email = email.toLowerCase();
  if (phone !== undefined) updateData.phone = phone;
  if (mobile !== undefined) updateData.mobile = mobile;
  if (isAdmin && role) updateData.role = role;
  if (isAdmin && department !== undefined) updateData.department = department || null;
  if (isAdmin && site !== undefined) updateData.site = site || null;
  if (isAdmin && isActive !== undefined) updateData.isActive = isActive;

  // If changing password, use save() to trigger hash
  if (password) {
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    Object.assign(user, updateData);
    user.password = password;
    await user.save();
    return NextResponse.json({ message: "User updated", user });
  }

  const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
    .populate("department", "name code")
    .populate("site", "name")
    .select("-password");

  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  return NextResponse.json({ message: "User updated", user });
}

// DELETE user (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  if (currentUser.id === id) {
    return NextResponse.json({ message: "Cannot delete your own account" }, { status: 400 });
  }

  await User.findByIdAndDelete(id);
  return NextResponse.json({ message: "User deleted" });
}
