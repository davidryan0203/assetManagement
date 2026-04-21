import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@backend/lib/jwt";
import prisma from "@backend/lib/prisma";
import {
  fromPrismaAssetState,
  serializeAsset,
  serializeDepartment,
  serializeProduct,
  serializeReport,
  serializeSite,
  serializeUser,
  toPrismaAssetState,
} from "@backend/lib/mysqlSerializers";
import { scopeAssetWhereToUser } from "@backend/lib/siteAccess";

type FilterRule = {
  field: string;
  operator: string;
  value: string;
};

// GET /api/reports/[id]/run — execute the report and return data rows
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      folder: { include: { createdBy: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  if (!report) return NextResponse.json({ message: "Report not found" }, { status: 404 });

  const filters = toFilterRules(report.filters);
  const where = buildWhereForModule(report.module, filters, report.subModule);
  let rows: Record<string, unknown>[] = [];

  if (report.module === "Assets") {
    const assets = await prisma.asset.findMany({
      where: scopeAssetWhereToUser(where as Prisma.AssetWhereInput, currentUser),
      include: {
        product: { include: { category: true, vendor: true, productType: { include: { category: true } } } },
        vendor: true,
        department: true,
        site: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const filtered = applyPostFilters(assets.map(serializeAsset), filters);
    const associatedTagMap = new Map(
      assets.map((asset) => [asset.id, asset.assetTag])
    );
    rows = filtered.map((a) => flattenAsset(a, associatedTagMap));
  } else if (report.module === "Sites") {
    const sites = await prisma.site.findMany({ where: where as Prisma.SiteWhereInput });
    const filtered = applyPostFilters(sites.map(serializeSite), filters);
    rows = filtered.map((s) => ({
      _id: s._id,
      name: s.name ?? "",
      description: s.description ?? "",
      country: s.country ?? "",
      createdAt: s.createdAt ? new Date(String(s.createdAt)).toLocaleDateString() : "",
    }));
  } else if (report.module === "Departments") {
    const departments = await prisma.department.findMany({ where: where as Prisma.DepartmentWhereInput });
    const filtered = applyPostFilters(departments.map(serializeDepartment), filters);
    rows = filtered.map((d) => ({
      _id: d._id,
      name: d.name ?? "",
      code: d.code ?? "",
      description: d.description ?? "",
      isActive: d.isActive ? "Yes" : "No",
      createdAt: d.createdAt ? new Date(String(d.createdAt)).toLocaleDateString() : "",
    }));
  } else if (report.module === "Users") {
    const users = await prisma.user.findMany({
      where: where as Prisma.UserWhereInput,
      include: {
        department: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true } },
      },
    });

    const filtered = applyPostFilters(users.map(serializeUser), filters);
    rows = filtered.map((u) => ({
      _id: u._id,
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role ?? "",
      "department.name": (u.department as { name?: string } | null)?.name ?? "",
      "site.name": (u.site as { name?: string } | null)?.name ?? "",
      createdAt: u.createdAt ? new Date(String(u.createdAt)).toLocaleDateString() : "",
    }));
  } else if (report.module === "Products") {
    const products = await prisma.product.findMany({
      where: where as Prisma.ProductWhereInput,
      include: { category: true, vendor: true, productType: { include: { category: true } } },
    });

    const filtered = applyPostFilters(products.map(serializeProduct), filters);
    rows = filtered.map((p) => ({
      _id: p._id,
      name: p.name ?? "",
      sku: p.sku ?? "",
      description: p.description ?? "",
      "category.name": (p.category as { name?: string } | null)?.name ?? "",
      "vendor.name": (p.vendor as { name?: string } | null)?.name ?? "",
      createdAt: p.createdAt ? new Date(String(p.createdAt)).toLocaleDateString() : "",
    }));
  }

  return NextResponse.json({
    report: serializeReport(report),
    rows,
    total: rows.length,
  });
}

function toFilterRules(input: unknown): FilterRule[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item as Partial<FilterRule>)
    .filter((item) => !!item.field)
    .map((item) => ({
      field: item.field || "",
      operator: item.operator || "is",
      value: item.value || "",
    }));
}

function buildWhereForModule(moduleName: string, filters: FilterRule[], subModule: string) {
  if (moduleName === "Assets") {
    const where: Prisma.AssetWhereInput = {};
    if (subModule && subModule !== "All") {
      where.product = { category: { name: subModule } };
    }

    for (const f of filters) {
      if (!f.value) continue;
      if (f.field === "assetTag") applyStringFilter(where, "assetTag", f.operator, f.value);
      if (f.field === "name") applyStringFilter(where, "name", f.operator, f.value);
      if (f.field === "serialNumber") applyStringFilter(where, "serialNumber", f.operator, f.value);
      if (f.field === "location") applyStringFilter(where, "location", f.operator, f.value);
      if (f.field === "barcodeQr") applyStringFilter(where, "barcodeQr", f.operator, f.value);
      if (f.field === "assetState") {
        where.assetState = toPrismaAssetState(f.value) as Prisma.AssetWhereInput["assetState"];
      }
    }

    return where;
  }

  if (moduleName === "Sites") {
    const where: Prisma.SiteWhereInput = {};
    for (const f of filters) {
      if (!f.value) continue;
      if (f.field === "name") applyStringFilter(where, "name", f.operator, f.value);
      if (f.field === "country") applyStringFilter(where, "country", f.operator, f.value);
      if (f.field === "description") applyStringFilter(where, "description", f.operator, f.value);
    }
    return where;
  }

  if (moduleName === "Departments") {
    const where: Prisma.DepartmentWhereInput = {};
    for (const f of filters) {
      if (!f.value) continue;
      if (f.field === "name") applyStringFilter(where, "name", f.operator, f.value);
      if (f.field === "code") applyStringFilter(where, "code", f.operator, f.value);
      if (f.field === "description") applyStringFilter(where, "description", f.operator, f.value);
    }
    return where;
  }

  if (moduleName === "Users") {
    const where: Prisma.UserWhereInput = {};
    if (subModule && subModule !== "All") {
      where.role = subModule as Prisma.UserWhereInput["role"];
    }

    for (const f of filters) {
      if (!f.value) continue;
      if (f.field === "name") {
        where.OR = [
          { firstName: { contains: f.value } },
          { lastName: { contains: f.value } },
        ];
      }
      if (f.field === "email") applyStringFilter(where, "email", f.operator, f.value);
      if (f.field === "role") where.role = f.value as Prisma.UserWhereInput["role"];
    }

    return where;
  }

  if (moduleName === "Products") {
    const where: Prisma.ProductWhereInput = {};
    for (const f of filters) {
      if (!f.value) continue;
      if (f.field === "name") applyStringFilter(where, "name", f.operator, f.value);
      if (f.field === "sku") applyStringFilter(where, "sku", f.operator, f.value);
      if (f.field === "description") applyStringFilter(where, "description", f.operator, f.value);
    }
    return where;
  }

  return {};
}

function applyStringFilter(
  target: Record<string, unknown>,
  field: string,
  operator: string,
  value: string
) {
  if (operator === "is") {
    target[field] = value;
    return;
  }

  if (operator === "is_not") {
    target.NOT = { ...(target.NOT as object), [field]: value };
    return;
  }

  if (operator === "contains") {
    target[field] = { contains: value, mode: "insensitive" };
    return;
  }

  if (operator === "starts_with") {
    target[field] = { startsWith: value, mode: "insensitive" };
    return;
  }

  if (operator === "ends_with") {
    target[field] = { endsWith: value, mode: "insensitive" };
  }
}

function applyPostFilters(records: Record<string, unknown>[], filters: FilterRule[]) {
  return records.filter((record) => {
    for (const f of filters) {
      if (!f.value) continue;
      const directFields = ["assetTag", "name", "serialNumber", "assetState", "location", "barcodeQr", "email", "sku", "description", "country", "code", "role"];
      if (directFields.includes(f.field)) continue;

      const val = getNestedValue(record, f.field);
      if (!matchesFilter(val, f.operator, f.value)) return false;
    }
    return true;
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
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

function flattenAsset(
  a: Record<string, unknown>,
  associatedTagMap: Map<string, string>
): Record<string, unknown> {
  const product = (a.product || {}) as Record<string, unknown>;
  const productCategory = (product.category || {}) as Record<string, unknown>;
  const productType = (product.productType || {}) as Record<string, unknown>;
  const productVendor = (product.vendor || {}) as Record<string, unknown>;
  const vendor = (a.vendor || {}) as Record<string, unknown>;
  const department = (a.department || {}) as Record<string, unknown>;
  const site = (a.site || {}) as Record<string, unknown>;
  const assignedTo = (a.assignedTo || {}) as Record<string, unknown>;
  const associatedToIds = Array.isArray(a.associatedToIds)
    ? a.associatedToIds.filter((id): id is string => typeof id === "string")
    : [];
  const associatedToTags = associatedToIds
    .map((id) => associatedTagMap.get(id) || id)
    .join(", ");
  const createdBy = (a.createdBy || {}) as Record<string, unknown>;

  const productTypeName = productType.name ?? productCategory.name ?? "";

  return {
    _id: a._id,
    assetTag: a.assetTag ?? "",
    name: a.name ?? "",
    serialNumber: a.serialNumber ?? "",
    barcodeQr: a.barcodeQr ?? "",
    location: a.location ?? "",
    assetState:
      typeof a.assetState === "string" ? fromPrismaAssetState(a.assetState) : a.assetState ?? "",
    purchaseCost: a.purchaseCost ?? null,
    acquisitionDate: a.acquisitionDate ? new Date(String(a.acquisitionDate)).toLocaleDateString() : "",
    expiryDate: a.expiryDate ? new Date(String(a.expiryDate)).toLocaleDateString() : "",
    warrantyExpiryDate: a.warrantyExpiryDate ? new Date(String(a.warrantyExpiryDate)).toLocaleDateString() : "",
    isNewDevice: a.isNewDevice ? "Yes" : "No",
    comment: a.comment ?? "",
    comment2: a.comment2 ?? "",
    conditionTag: a.conditionTag ?? "",
    grade: a.grade ?? "",
    cell: a.cell ?? "",
    devicePurchase: a.devicePurchase ?? "",
    lastSeen: a.lastSeen ? new Date(String(a.lastSeen)).toLocaleDateString() : "",
    numAuthDevices: a.numAuthDevices ?? "",
    stateComments: a.stateComments ?? "",
    "product.name": product.name ?? "",
    "product.sku": product.sku ?? "",
    // Keep legacy key populated for already-saved reports that still reference it.
    "product.category.name": productTypeName,
    "product.productType.name": productTypeName,
    "product.vendor.name": productVendor.name ?? "",
    "vendor.name": vendor.name ?? "",
    "department.name": department.name ?? "",
    "department.code": department.code ?? "",
    "site.name": site.name ?? "",
    "assignedTo.name": assignedTo.name ?? "Not Assigned",
    "assignedTo.email": assignedTo.email ?? "",
    "associatedTo.assetTag": associatedToTags,
    "createdBy.name": createdBy.name ?? "",
    createdAt: a.createdAt ? new Date(String(a.createdAt)).toLocaleDateString() : "",
  };
}
