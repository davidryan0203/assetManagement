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
  // Keep this endpoint idempotent so it can be run repeatedly for local testing.
  for (const dept of DEFAULT_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description, isActive: true },
      create: dept,
    });
  }

  const technologyDept = await prisma.department.findUniqueOrThrow({ where: { code: "TECH" } });
  const operationsDept = await prisma.department.findUniqueOrThrow({ where: { code: "OPS" } });

  const hqSite = await prisma.site.upsert({
    where: { name: "Headquarters" },
    update: { city: "Austin", stateProvince: "TX", country: "USA", isActive: true },
    create: {
      name: "Headquarters",
      description: "Primary office and warehouse",
      city: "Austin",
      stateProvince: "TX",
      country: "USA",
      isActive: true,
    },
  });

  const westSite = await prisma.site.upsert({
    where: { name: "West Campus" },
    update: { city: "Phoenix", stateProvince: "AZ", country: "USA", isActive: true },
    create: {
      name: "West Campus",
      description: "Regional support office",
      city: "Phoenix",
      stateProvince: "AZ",
      country: "USA",
      isActive: true,
    },
  });

  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const userPassword = await bcrypt.hash("Test@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@inventory.com" },
    update: {
      firstName: "Super",
      lastName: "Admin",
      displayName: "Super Admin",
      role: "admin",
      isActive: true,
      department: { connect: { id: technologyDept.id } },
      site: { connect: { id: hqSite.id } },
    },
    create: {
      firstName: "Super",
      lastName: "Admin",
      displayName: "Super Admin",
      email: "admin@inventory.com",
      password: adminPassword,
      role: "admin",
      isActive: true,
      department: { connect: { id: technologyDept.id } },
      site: { connect: { id: hqSite.id } },
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      site: { select: { id: true, name: true } },
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@inventory.com" },
    update: {
      firstName: "Maya",
      lastName: "Manager",
      displayName: "Maya Manager",
      role: "manager",
      isActive: true,
      department: { connect: { id: operationsDept.id } },
      site: { connect: { id: westSite.id } },
    },
    create: {
      firstName: "Maya",
      lastName: "Manager",
      displayName: "Maya Manager",
      email: "manager@inventory.com",
      password: userPassword,
      role: "manager",
      isActive: true,
      department: { connect: { id: operationsDept.id } },
      site: { connect: { id: westSite.id } },
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      site: { select: { id: true, name: true } },
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@inventory.com" },
    update: {
      firstName: "Sam",
      lastName: "Staff",
      displayName: "Sam Staff",
      role: "staff",
      isActive: true,
      department: { connect: { id: technologyDept.id } },
      site: { connect: { id: hqSite.id } },
    },
    create: {
      firstName: "Sam",
      lastName: "Staff",
      displayName: "Sam Staff",
      email: "staff@inventory.com",
      password: userPassword,
      role: "staff",
      isActive: true,
      department: { connect: { id: technologyDept.id } },
      site: { connect: { id: hqSite.id } },
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      site: { select: { id: true, name: true } },
    },
  });

  const laptopCategory = await prisma.category.upsert({
    where: { name: "Laptops" },
    update: { description: "Laptop assets", isActive: true },
    create: { name: "Laptops", description: "Laptop assets", isActive: true },
  });

  const mobileCategory = await prisma.category.upsert({
    where: { name: "Mobile Devices" },
    update: { description: "Phones and tablets", isActive: true },
    create: { name: "Mobile Devices", description: "Phones and tablets", isActive: true },
  });

  const laptopType = await prisma.productType.upsert({
    where: { name: "Laptop - Asset" },
    update: { categoryId: laptopCategory.id, type: "Asset", isActive: true },
    create: { name: "Laptop - Asset", categoryId: laptopCategory.id, type: "Asset", isActive: true },
  });

  const phoneType = await prisma.productType.upsert({
    where: { name: "Phone - Asset" },
    update: { categoryId: mobileCategory.id, type: "Asset", isActive: true },
    create: { name: "Phone - Asset", categoryId: mobileCategory.id, type: "Asset", isActive: true },
  });

  const dellVendor = await prisma.vendor.upsert({
    where: { name: "Dell" },
    update: { contactName: "Dell Sales", email: "sales@dell.com", isActive: true },
    create: { name: "Dell", contactName: "Dell Sales", email: "sales@dell.com", isActive: true },
  });

  const appleVendor = await prisma.vendor.upsert({
    where: { name: "Apple" },
    update: { contactName: "Apple Enterprise", email: "enterprise@apple.com", isActive: true },
    create: { name: "Apple", contactName: "Apple Enterprise", email: "enterprise@apple.com", isActive: true },
  });

  let latitudeProduct = await prisma.product.findFirst({ where: { name: "Dell Latitude 5540", sku: "DL-5540" } });
  if (!latitudeProduct) {
    latitudeProduct = await prisma.product.create({
      data: {
        name: "Dell Latitude 5540",
        sku: "DL-5540",
        manufacturer: "Dell",
        modelNumber: "Latitude 5540",
        partNo: "LAT-5540",
        cost: 1249.99,
        description: "Business laptop",
        defaultWarrantyMonths: 36,
        categoryId: laptopCategory.id,
        vendorId: dellVendor.id,
        productTypeId: laptopType.id,
      },
    });
  }

  let iphoneProduct = await prisma.product.findFirst({ where: { name: "iPhone 15", sku: "IP15-128" } });
  if (!iphoneProduct) {
    iphoneProduct = await prisma.product.create({
      data: {
        name: "iPhone 15",
        sku: "IP15-128",
        manufacturer: "Apple",
        modelNumber: "A3090",
        partNo: "IP15-128-BLK",
        cost: 899.0,
        description: "Company mobile device",
        defaultWarrantyMonths: 12,
        categoryId: mobileCategory.id,
        vendorId: appleVendor.id,
        productTypeId: phoneType.id,
      },
    });
  }

  await prisma.asset.upsert({
    where: { assetTag: "AST-1001" },
    update: {
      name: "Dell Latitude 5540 - Admin",
      productId: latitudeProduct.id,
      vendorId: dellVendor.id,
      departmentId: technologyDept.id,
      siteId: hqSite.id,
      assignedToId: admin.id,
      createdById: admin.id,
      serialNumber: "DL5540-0001",
      assetState: "Assigned",
      location: "HQ - IT Room",
      stateComments: "Seed test asset",
      isNewDevice: true,
    },
    create: {
      name: "Dell Latitude 5540 - Admin",
      assetTag: "AST-1001",
      productId: latitudeProduct.id,
      vendorId: dellVendor.id,
      departmentId: technologyDept.id,
      siteId: hqSite.id,
      assignedToId: admin.id,
      createdById: admin.id,
      serialNumber: "DL5540-0001",
      purchaseCost: 1249.99,
      acquisitionDate: new Date("2026-01-15"),
      warrantyExpiryDate: new Date("2029-01-15"),
      location: "HQ - IT Room",
      assetState: "Assigned",
      stateComments: "Seed test asset",
      isNewDevice: true,
    },
  });

  await prisma.asset.upsert({
    where: { assetTag: "AST-1002" },
    update: {
      name: "iPhone 15 - Manager",
      productId: iphoneProduct.id,
      vendorId: appleVendor.id,
      departmentId: operationsDept.id,
      siteId: westSite.id,
      assignedToId: manager.id,
      createdById: admin.id,
      serialNumber: "IP15-0002",
      assetState: "Assigned",
      location: "West - Front Office",
      stateComments: "Seed test mobile asset",
      isNewDevice: true,
    },
    create: {
      name: "iPhone 15 - Manager",
      assetTag: "AST-1002",
      productId: iphoneProduct.id,
      vendorId: appleVendor.id,
      departmentId: operationsDept.id,
      siteId: westSite.id,
      assignedToId: manager.id,
      createdById: admin.id,
      serialNumber: "IP15-0002",
      purchaseCost: 899.0,
      acquisitionDate: new Date("2026-02-01"),
      warrantyExpiryDate: new Date("2027-02-01"),
      location: "West - Front Office",
      assetState: "Assigned",
      stateComments: "Seed test mobile asset",
      isNewDevice: true,
    },
  });

  return NextResponse.json({
    message: "Seed completed with sample data for testing",
    credentials: [
      { email: "admin@inventory.com", password: "Admin@123" },
      { email: "manager@inventory.com", password: "Test@123" },
      { email: "staff@inventory.com", password: "Test@123" },
    ],
    users: [serializeUser(admin), serializeUser(manager), serializeUser(staff)],
    sample: {
      departments: DEFAULT_DEPARTMENTS.map((d) => d.name),
      sites: [hqSite.name, westSite.name],
      categories: [laptopCategory.name, mobileCategory.name],
      assets: ["AST-1001", "AST-1002"],
    },
  });
}
