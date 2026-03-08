import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import User from "@backend/models/User";
import "@backend/models/Department"; // ensure model is registered for populate
import "@backend/models/Site";       // ensure model is registered for populate
import { getUserFromRequest } from "@backend/lib/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await User.findById(user.id).populate("department", "name code").populate("site", "name");
  if (!dbUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: dbUser });
}
