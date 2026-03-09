import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@backend/lib/dbConnect";
import Report from "@backend/models/Report";
import Asset from "@backend/models/Asset";
import Product from "@backend/models/Product";
import User from "@backend/models/User";
import Department from "@backend/models/Department";
import Site from "@backend/models/Site";
import "@backend/models/Category";
import "@backend/models/Vendor";
import { getUserFromRequest } from "@backend/lib/jwt";

// GET /api/reports/[id]/run — execute the report and return data rows
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await Report.findById(id);
  if (!report) return NextResponse.json({ message: "Report not found" }, { status: 404 });

  // ── Build Mongoose query based on module ─────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  // Apply subModule filter (category name for Assets module)
  if (report.module === "Assets" && report.subModule && report.subModule !== "All") {
    // subModule is a category name — we'll filter post-fetch
  }

  // Apply report filters
  for (const f of report.filters) {
    if (!f.value) continue;
    applyFilter(query, f.field, f.operator, f.value);
  }

  let rows: Record<string, unknown>[] = [];

  if (report.module === "Assets") {
    const assets = await Asset.find(query)
      .populate({ path: "product", select: "name sku category vendor", populate: [{ path: "category", select: "name" }, { path: "vendor", select: "name" }] })
      .populate("vendor", "name")
      .populate("department", "name code")
      .populate("site", "name")
      .populate("assignedTo", "name email")
      .populate("associatedTo", "name assetTag")
      .populate("createdBy", "name")
      .lean();

    // Filter by category name (subModule)
    const filtered =
      report.subModule && report.subModule !== "All"
        ? assets.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (a: any) => a.product?.category?.name === report.subModule
          )
        : assets;

    // Apply string-based filters that need populated data (e.g. site.name)
    const postFiltered = applyPostFilters(filtered, report.filters);

    rows = postFiltered.map((a) => flattenAsset(a));
  } else if (report.module === "Sites") {
    const sites = await Site.find(query).lean();
    const postFiltered = applyPostFilters(sites, report.filters);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows = postFiltered.map((s: any) => ({
      _id: s._id?.toString(),
      name: s.name ?? "",
      description: s.description ?? "",
      country: s.country ?? "",
      createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
    }));
  } else if (report.module === "Departments") {
    const departments = await Department.find(query).lean();
    const postFiltered = applyPostFilters(departments, report.filters);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows = postFiltered.map((d: any) => ({
      _id: d._id?.toString(),
      name: d.name ?? "",
      code: d.code ?? "",
      description: d.description ?? "",
      isActive: d.isActive ? "Yes" : "No",
      createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "",
    }));
  } else if (report.module === "Users") {
    const usersQuery = { ...query };
    if (report.subModule && report.subModule !== "All") {
      usersQuery["role"] = report.subModule;
    }
    const users = await User.find(usersQuery)
      .populate("department", "name")
      .populate("site", "name")
      .lean();
    const postFiltered = applyPostFilters(users, report.filters);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows = postFiltered.map((u: any) => ({
      _id: u._id?.toString(),
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role ?? "",
      "department.name": u.department?.name ?? "",
      "site.name": u.site?.name ?? "",
      createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
    }));
  } else if (report.module === "Products") {
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("vendor", "name")
      .lean();
    const postFiltered = applyPostFilters(products, report.filters);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows = postFiltered.map((p: any) => ({
      _id: p._id?.toString(),
      name: p.name ?? "",
      sku: p.sku ?? "",
      description: p.description ?? "",
      "category.name": p.category?.name ?? "",
      "vendor.name": p.vendor?.name ?? "",
      createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
    }));
  }

  return NextResponse.json({
    report: {
      _id: report._id,
      title: report.title,
      reportType: report.reportType,
      module: report.module,
      subModule: report.subModule,
      selectedColumns: report.selectedColumns,
      filters: report.filters,
    },
    rows,
    total: rows.length,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: Record<string, any>,
  field: string,
  operator: string,
  value: string
) {
  // Only handle top-level direct schema fields here; nested/populated fields are post-filtered
  const directFields: Record<string, string> = {
    assetTag: "assetTag",
    name: "name",
    serialNumber: "serialNumber",
    assetState: "assetState",
    location: "location",
    barcodeQr: "barcodeQr",
  };

  const mongoField = directFields[field];
  if (!mongoField) return;

  switch (operator) {
    case "is":
      query[mongoField] = value;
      break;
    case "is_not":
      query[mongoField] = { $ne: value };
      break;
    case "contains":
      query[mongoField] = { $regex: value, $options: "i" };
      break;
    case "starts_with":
      query[mongoField] = { $regex: `^${value}`, $options: "i" };
      break;
    case "ends_with":
      query[mongoField] = { $regex: `${value}$`, $options: "i" };
      break;
  }
}

function applyPostFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  records: any[],
  filters: { field: string; operator: string; value: string }[]
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return records.filter((record: any) => {
    for (const f of filters) {
      if (!f.value) continue;
      // Skip fields handled in query already
      const directFields = ["assetTag", "name", "serialNumber", "assetState", "location", "barcodeQr"];
      if (directFields.includes(f.field)) continue;

      const val = getNestedValue(record, f.field);
      if (!matchesFilter(val, f.operator, f.value)) return false;
    }
    return true;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): string {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return "";
    current = current[part];
  }
  return current?.toString() ?? "";
}

function matchesFilter(val: string, operator: string, filterValue: string): boolean {
  const v = val.toLowerCase();
  const fv = filterValue.toLowerCase();
  switch (operator) {
    case "is": return v === fv;
    case "is_not": return v !== fv;
    case "contains": return v.includes(fv);
    case "starts_with": return v.startsWith(fv);
    case "ends_with": return v.endsWith(fv);
    default: return true;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenAsset(a: any): Record<string, unknown> {
  return {
    _id: a._id?.toString(),
    assetTag: a.assetTag ?? "",
    name: a.name ?? "",
    serialNumber: a.serialNumber ?? "",
    barcodeQr: a.barcodeQr ?? "",
    location: a.location ?? "",
    assetState: a.assetState ?? "",
    purchaseCost: a.purchaseCost ?? null,
    acquisitionDate: a.acquisitionDate ? new Date(a.acquisitionDate).toLocaleDateString() : "",
    expiryDate: a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : "",
    warrantyExpiryDate: a.warrantyExpiryDate ? new Date(a.warrantyExpiryDate).toLocaleDateString() : "",
    isNewDevice: a.isNewDevice ? "Yes" : "No",
    comment: a.comment ?? "",
    comment2: a.comment2 ?? "",
    conditionTag: a.conditionTag ?? "",
    grade: a.grade ?? "",
    cell: a.cell ?? "",
    devicePurchase: a.devicePurchase ?? "",
    lastSeen: a.lastSeen ? new Date(a.lastSeen).toLocaleDateString() : "",
    numAuthDevices: a.numAuthDevices ?? "",
    stateComments: a.stateComments ?? "",
    // Populated
    "product.name": a.product?.name ?? "",
    "product.sku": a.product?.sku ?? "",
    "product.category.name": a.product?.category?.name ?? "",
    "product.vendor.name": a.product?.vendor?.name ?? "",
    "vendor.name": a.vendor?.name ?? "",
    "department.name": a.department?.name ?? "",
    "department.code": a.department?.code ?? "",
    "site.name": a.site?.name ?? "",
    "assignedTo.name": a.assignedTo?.name ?? "Not Assigned",
    "assignedTo.email": a.assignedTo?.email ?? "",
    "associatedTo.assetTag": a.associatedTo?.assetTag ?? "",
    "createdBy.name": a.createdBy?.name ?? "",
    createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "",
  };
}
