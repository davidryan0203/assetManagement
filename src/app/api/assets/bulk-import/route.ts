import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@backend/lib/prisma";
import { getUserFromRequest } from "@backend/lib/jwt";
import * as XLSX from "xlsx";

type ParsedAssetRow = {
  rowNumber: number;
  name: string;
  assetTag: string;
  serialNumber: string;
  productName: string;
  productTypeName: string;
  departmentName: string;
};

function slugifyDepartmentCodeSeed(value: string) {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
  if (!cleaned) return "DEPT";
  return cleaned.slice(0, 8);
}

async function buildDepartmentCodes(
  tx: Prisma.TransactionClient,
  names: string[]
): Promise<Map<string, string>> {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (uniqueNames.length === 0) return new Map();

  const usedCodeRows = await tx.department.findMany({
    select: { code: true },
  });
  const usedCodes = new Set(usedCodeRows.map((row) => row.code.toUpperCase()));

  const codeByName = new Map<string, string>();
  for (const name of uniqueNames) {
    const seed = slugifyDepartmentCodeSeed(name);
    let candidate = seed;
    let suffix = 1;
    while (usedCodes.has(candidate)) {
      const suffixText = String(suffix);
      const prefixLimit = Math.max(1, 8 - suffixText.length);
      candidate = `${seed.slice(0, prefixLimit)}${suffixText}`;
      suffix += 1;
    }
    usedCodes.add(candidate);
    codeByName.set(name, candidate);
  }

  return codeByName;
}

type HeaderIndexMap = {
  assetId: number;
  assetTag: number;
  productType: number;
  product: number;
  serial: number;
  location: number;
};

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\-_]+/g, " ");
}

function normalizeMatchKey(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function readAsRows(fileName: string, bytes: Uint8Array): string[][] {
  const lowerName = fileName.toLowerCase();

  const pickSheet = (workbook: XLSX.WorkBook): XLSX.WorkSheet | undefined => {
    const preferredName = workbook.SheetNames.find((name) => normalizeMatchKey(name) === "for migration");
    return workbook.Sheets[preferredName || workbook.SheetNames[0] || ""];
  };

  const toStringRows = (sheet: XLSX.WorkSheet | undefined): string[][] => {
    if (!sheet) return [];
    const jsonRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    return jsonRows.map((row) => row.map((cell) => String(cell ?? "").trim()));
  };

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const workbook = XLSX.read(bytes, { type: "array" });
    return toStringRows(pickSheet(workbook));
  }

  const text = new TextDecoder("utf-8").decode(bytes);
  const workbook = XLSX.read(text, { type: "string" });
  return toStringRows(pickSheet(workbook));
}

function findHeaderIndexes(row: string[]): HeaderIndexMap {
  const normalized = row.map(normalizeHeader);

  const find = (aliases: string[]) => {
    for (const alias of aliases) {
      const index = normalized.findIndex((header) => header === alias);
      if (index >= 0) return index;
    }
    return -1;
  };

  const assetId = find(["asset id", "assetid"]);
  const assetTag = find(["asset tag", "assettag"]);
  const productType = find(["product type", "producttype"]);
  const product = find(["product"]);
  const serial = find(["serial", "serial number", "serialnumber"]);
  const location = find(["location", "department"]);

  if (assetId < 0 && assetTag < 0) {
    throw new Error("Missing required column: Asset ID or Asset Tag");
  }
  if (productType < 0) {
    throw new Error("Missing required column: Product Type");
  }
  if (product < 0) {
    throw new Error("Missing required column: Product");
  }
  if (location < 0) {
    throw new Error("Missing required column: Location");
  }

  return {
    assetId,
    assetTag,
    productType,
    product,
    serial,
    location,
  };
}

function getCellValue(row: string[], index: number) {
  if (index < 0) return "";
  return String(row[index] ?? "").trim();
}

function parseAssetRows(rows: string[][]): ParsedAssetRow[] {
  if (!rows.length) {
    throw new Error("The uploaded file is empty");
  }

  const headerIndexes = findHeaderIndexes(rows[0] || []);
  const parsed: ParsedAssetRow[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const rawAssetId = getCellValue(row, headerIndexes.assetId);
    const rawAssetTag = getCellValue(row, headerIndexes.assetTag);
    const rawProductType = getCellValue(row, headerIndexes.productType);
    const rawProduct = getCellValue(row, headerIndexes.product);
    const rawSerial = getCellValue(row, headerIndexes.serial);
    const rawLocation = getCellValue(row, headerIndexes.location);

    const hasAnyValue = [rawAssetId, rawAssetTag, rawProductType, rawProduct, rawSerial, rawLocation]
      .some((value) => value.length > 0);
    if (!hasAnyValue) continue;

    const derivedAssetTag = (rawAssetTag || rawAssetId).toUpperCase();
    const derivedName = rawAssetId || rawAssetTag;

    if (!derivedAssetTag) {
      throw new Error(`Row ${i + 1}: Asset Tag is required`);
    }
    if (!derivedName) {
      throw new Error(`Row ${i + 1}: Asset ID (Name) is required`);
    }
    if (!rawProductType) {
      throw new Error(`Row ${i + 1}: Product Type is required`);
    }
    if (!rawProduct) {
      throw new Error(`Row ${i + 1}: Product is required`);
    }
    if (!rawLocation) {
      throw new Error(`Row ${i + 1}: Location is required`);
    }

    parsed.push({
      rowNumber: i + 1,
      name: derivedName,
      assetTag: derivedAssetTag,
      serialNumber: rawSerial,
      productName: rawProduct,
      productTypeName: rawProductType,
      departmentName: rawLocation,
    });
  }

  if (!parsed.length) {
    throw new Error("No data rows found to import");
  }

  return parsed;
}

export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const siteId = String(formData.get("siteId") || "").trim();

    if (!siteId) {
      return NextResponse.json({ message: "Site is required" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Please upload a CSV or XLSX file" }, { status: 400 });
    }

    const fileName = file.name || "upload.csv";
    const supported = [".csv", ".xlsx", ".xls"].some((ext) => fileName.toLowerCase().endsWith(ext));
    if (!supported) {
      return NextResponse.json({ message: "Unsupported file type. Use CSV or XLSX." }, { status: 400 });
    }

    const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, name: true } });
    if (!site) {
      return NextResponse.json({ message: "Selected site was not found" }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const rows = readAsRows(fileName, new Uint8Array(arrayBuffer));
    const parsedRows = parseAssetRows(rows);

    const duplicateTagsInFile = Array.from(
      parsedRows
        .reduce((acc, row) => {
          const count = acc.get(row.assetTag) ?? 0;
          acc.set(row.assetTag, count + 1);
          return acc;
        }, new Map<string, number>())
        .entries()
    )
      .filter(([, count]) => count > 1)
      .map(([tag]) => tag);

    if (duplicateTagsInFile.length > 0) {
      return NextResponse.json(
        {
          message: "Duplicate asset tags detected in the uploaded file",
          duplicateAssetTags: duplicateTagsInFile,
        },
        { status: 409 }
      );
    }

    const assetTags = parsedRows.map((row) => row.assetTag);
    const existingAssets = await prisma.asset.findMany({
      where: { assetTag: { in: assetTags } },
      select: { assetTag: true, id: true, name: true },
    });

    if (existingAssets.length > 0) {
      return NextResponse.json(
        {
          message: "Upload halted: one or more asset tags already exist",
          existingAssets,
        },
        { status: 409 }
      );
    }

    let itCategory = await prisma.category.findFirst({
      where: { name: "IT" },
      select: { id: true, name: true },
    });

    if (!itCategory) {
      itCategory = await prisma.category.create({
        data: {
          name: "IT",
          description: "Auto-created from asset bulk upload",
          isActive: true,
        },
        select: { id: true, name: true },
      });
    }

    let productTypes = await prisma.productType.findMany({
      select: { id: true, name: true, type: true, categoryId: true },
    });
    let productTypesByName = new Map(productTypes.map((pt) => [normalizeMatchKey(pt.name), pt]));

    let products = await prisma.product.findMany({
      select: { id: true, name: true, productTypeId: true, categoryId: true },
    });

    let departments = await prisma.department.findMany({
      select: { id: true, name: true },
    });
    let departmentsByName = new Map(departments.map((dept) => [normalizeMatchKey(dept.name), dept]));

    const validationErrors: string[] = [];
    const productTypeCreatesByKey = new Map<string, { name: string; categoryId: string }>();
    const productCreatesByKey = new Map<string, { name: string; productTypeId: string; categoryId: string }>();
    const departmentCreatesByKey = new Map<string, string>();
    const prepared = parsedRows.map((row) => {
      const matchedProductType = productTypesByName.get(normalizeMatchKey(row.productTypeName));

      if (!matchedProductType) {
        const key = normalizeMatchKey(row.productTypeName);
        if (!productTypeCreatesByKey.has(key)) {
          productTypeCreatesByKey.set(key, {
            name: row.productTypeName,
            categoryId: itCategory.id,
          });
        }
      }

      const matchedDepartment = departmentsByName.get(normalizeMatchKey(row.departmentName));
      if (!matchedDepartment) {
        const key = normalizeMatchKey(row.departmentName);
        if (!departmentCreatesByKey.has(key)) {
          departmentCreatesByKey.set(key, row.departmentName);
        }
      }

      return {
        ...row,
        productId: "",
        departmentId: matchedDepartment?.id || "",
      };
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          message: "Upload halted due to validation errors",
          errors: validationErrors.slice(0, 30),
          errorCount: validationErrors.length,
        },
        { status: 400 }
      );
    }

    const newProductTypes = Array.from(productTypeCreatesByKey.values());
    if (newProductTypes.length > 0) {
      await prisma.productType.createMany({
        data: newProductTypes.map((item) => ({
          name: item.name,
          categoryId: item.categoryId,
          type: "Asset",
          isActive: true,
        })),
        skipDuplicates: true,
      });

      productTypes = await prisma.productType.findMany({
        select: { id: true, name: true, type: true, categoryId: true },
      });
      productTypesByName = new Map(productTypes.map((pt) => [normalizeMatchKey(pt.name), pt]));
    }

    const existingProductByKey = new Map(
      products
        .filter((product) => !!product.productTypeId)
        .map((product) => [`${normalizeMatchKey(product.name)}::${product.productTypeId}`, product])
    );

    for (const row of prepared) {
      const matchedProductType = productTypesByName.get(normalizeMatchKey(row.productTypeName));
      if (!matchedProductType) {
        validationErrors.push(`Row ${row.rowNumber}: Unable to resolve Product Type \"${row.productTypeName}\"`);
        continue;
      }

      const productKey = `${normalizeMatchKey(row.productName)}::${matchedProductType.id}`;
      if (!existingProductByKey.has(productKey) && !productCreatesByKey.has(productKey)) {
        productCreatesByKey.set(productKey, {
          name: row.productName,
          productTypeId: matchedProductType.id,
          categoryId: itCategory.id,
        });
      }
    }

    const newProducts = Array.from(productCreatesByKey.values());
    if (newProducts.length > 0) {
      await prisma.product.createMany({
        data: newProducts.map((item) => ({
          name: item.name,
          cost: 0,
          categoryId: item.categoryId,
          productTypeId: item.productTypeId,
          description: "Auto-created from asset bulk upload",
          isActive: true,
        })),
      });

      products = await prisma.product.findMany({
        select: { id: true, name: true, productTypeId: true, categoryId: true },
      });
    }

    const newDepartmentNames = Array.from(departmentCreatesByKey.values());
    if (newDepartmentNames.length > 0) {
      await prisma.$transaction(async (tx) => {
        const codeByName = await buildDepartmentCodes(tx, newDepartmentNames);
        await tx.department.createMany({
          data: newDepartmentNames.map((name) => ({
            name,
            code: codeByName.get(name) || "DEPT",
            description: "Auto-created from asset bulk upload",
            isActive: true,
          })),
          skipDuplicates: true,
        });
      });

      departments = await prisma.department.findMany({
        select: { id: true, name: true },
      });
      departmentsByName = new Map(departments.map((dept) => [normalizeMatchKey(dept.name), dept]));
    }

    const unresolvedDepartments = prepared
      .map((row) => ({ rowNumber: row.rowNumber, departmentName: row.departmentName, dept: departmentsByName.get(normalizeMatchKey(row.departmentName)) }))
      .filter((row) => !row.dept);

    if (unresolvedDepartments.length > 0) {
      return NextResponse.json(
        {
          message: "Upload halted due to unresolved departments",
          errors: unresolvedDepartments.slice(0, 30).map((row) => (
            `Row ${row.rowNumber}: Unknown Department/Location \"${row.departmentName}\"`
          )),
          errorCount: unresolvedDepartments.length,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const productsByKey = new Map(
      products
        .filter((product) => !!product.productTypeId)
        .map((product) => [`${normalizeMatchKey(product.name)}::${product.productTypeId}`, product])
    );

    const unresolvedProducts = prepared
      .map((row) => {
        const productType = productTypesByName.get(normalizeMatchKey(row.productTypeName));
        if (!productType) {
          return { rowNumber: row.rowNumber, productName: row.productName, missing: true };
        }
        const product = productsByKey.get(`${normalizeMatchKey(row.productName)}::${productType.id}`);
        return { rowNumber: row.rowNumber, productName: row.productName, missing: !product, productId: product?.id };
      })
      .filter((row) => row.missing);

    if (unresolvedProducts.length > 0) {
      return NextResponse.json(
        {
          message: "Upload halted due to unresolved products",
          errors: unresolvedProducts.slice(0, 30).map((row) => `Row ${row.rowNumber}: Unknown Product \"${row.productName}\"`),
          errorCount: unresolvedProducts.length,
        },
        { status: 400 }
      );
    }

    const createData = prepared.map((row) => ({
      productType: productTypesByName.get(normalizeMatchKey(row.productTypeName)),
      product: productTypesByName.get(normalizeMatchKey(row.productTypeName))
        ? productsByKey.get(`${normalizeMatchKey(row.productName)}::${productTypesByName.get(normalizeMatchKey(row.productTypeName))!.id}`)
        : null,
      row,
    }))
      .map(({ row, product }) => ({
      name: row.name,
      assetTag: row.assetTag,
      serialNumber: row.serialNumber || null,
      location: row.departmentName,
      productId: product?.id || row.productId,
      departmentId: departmentsByName.get(normalizeMatchKey(row.departmentName))?.id || row.departmentId,
      siteId: site.id,
      createdById: currentUser.id,
      assetState: "Assigned" as const,
      quantity: 0,
      isNewDevice: true,
      createdAt: now,
      updatedAt: now,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.asset.createMany({ data: createData });
    });

    return NextResponse.json({
      message: "Assets imported successfully",
      importedCount: createData.length,
      createdProductTypes: newProductTypes.length,
      createdProducts: newProducts.length,
      createdDepartments: newDepartmentNames.length,
      site: { id: site.id, name: site.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import assets";
    return NextResponse.json({ message }, { status: 400 });
  }
}
