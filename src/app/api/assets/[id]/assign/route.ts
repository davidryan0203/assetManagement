import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Asset from "@backend/models/Asset";
import User from "@backend/models/User";
import "@backend/models/Product";
import "@backend/models/Category";
import "@backend/models/Vendor";
import "@backend/models/Department";
import "@backend/models/Site";
import { getUserFromRequest } from "@backend/lib/jwt";

// POST /api/assets/[id]/assign
// Assigns (or un-assigns) an asset to a user and/or department.
// Body: { assignedTo, department, associatedTo, site, retainSite, stateComments }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role === "staff") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { assignedTo, department, associatedTo, site, retainSite, stateComments } = body;

  // If neither user nor department is provided, we are un-assigning
  const newState = assignedTo ? "In Use" : "In Store";

  // If retainSite is true, keep the site that was auto-resolved from the user;
  // otherwise use whatever site was explicitly provided.
  let resolvedSite = site || null;

  if (assignedTo && retainSite) {
    // Auto-resolve site from the assigned user's site
    const userDoc = await User.findById(assignedTo).select("site").lean();
    if (userDoc?.site) {
      resolvedSite = userDoc.site.toString();
    }
  }

  const asset = await Asset.findByIdAndUpdate(
    id,
    {
      assignedTo: assignedTo || null,
      department: department || null,
      associatedTo: associatedTo || null,
      site: resolvedSite,
      retainSite: !!retainSite,
      stateComments: stateComments || "",
      assetState: newState,
    },
    { new: true, runValidators: true }
  )
    .populate({ path: "product", select: "name sku category vendor", populate: [{ path: "category", select: "name" }, { path: "vendor", select: "name" }] })
    .populate("vendor", "name")
    .populate("department", "name code")
    .populate("site", "name")
    .populate("assignedTo", "name email firstName lastName site")
    .populate("associatedTo", "name assetTag");

  if (!asset) return NextResponse.json({ message: "Asset not found" }, { status: 404 });

  return NextResponse.json({ message: "Asset assigned", asset });
}
