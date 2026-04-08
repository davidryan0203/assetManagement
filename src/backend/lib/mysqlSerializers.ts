type DepartmentShape = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type SiteShape = {
  id: string;
  name: string;
  description?: string | null;
  region?: string | null;
  timeZone?: string | null;
  language?: string | null;
  doorNumber?: string | null;
  street?: string | null;
  landmark?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  zipPostalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phoneNo?: string | null;
  faxNo?: string | null;
  webUrl?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type CategoryShape = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type VendorShape = {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type ProductTypeShape = {
  id: string;
  name: string;
  type: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  category?: CategoryShape | null;
};

type ProductShape = {
  id: string;
  name: string;
  manufacturer?: string | null;
  partNo?: string | null;
  cost?: number | null;
  sku?: string | null;
  description?: string | null;
  modelNumber?: string | null;
  defaultWarrantyMonths?: number | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  category?: CategoryShape | null;
  vendor?: VendorShape | null;
  productType?: ProductTypeShape | null;
};

type ReportFolderShape = {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: Pick<UserShape, "id" | "firstName" | "lastName"> | null;
};

type ReportShape = {
  id: string;
  title: string;
  reportType: string;
  module: string;
  subModule: string;
  selectedColumns: unknown;
  filters: unknown;
  createdAt?: Date;
  updatedAt?: Date;
  folder?: ReportFolderShape | null;
  createdBy?: Pick<UserShape, "id" | "firstName" | "lastName"> | null;
};

type AssetShape = {
  id: string;
  name: string;
  assetTag: string;
  quantity?: number | null;
  serialNumber?: string | null;
  purchaseCost?: number | null;
  acquisitionDate?: Date | null;
  expiryDate?: Date | null;
  warrantyExpiryDate?: Date | null;
  barcodeQr?: string | null;
  location?: string | null;
  assetState: string;
  retainSite?: boolean;
  stateComments?: string | null;
  isNewDevice?: boolean;
  assetCheck?: string | null;
  comment?: string | null;
  comment2?: string | null;
  conditionTag?: string | null;
  grade?: string | null;
  cell?: string | null;
  devicePurchase?: string | null;
  lastSeen?: Date | null;
  numAuthDevices?: number | null;
  disposalApprovalPending?: boolean;
  disposalApprovalRequestedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  product?: ProductShape | null;
  vendor?: VendorShape | null;
  department?: DepartmentShape | null;
  site?: SiteShape | null;
  assignedTo?: Pick<UserShape, "id" | "firstName" | "lastName" | "email"> | null;
  associatedToIds?: unknown;
  createdBy?: Pick<UserShape, "id" | "firstName" | "lastName"> | null;
};

type UserShape = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  employeeId: string | null;
  description: string | null;
  email: string;
  role: "admin" | "manager" | "staff";
  phone: string | null;
  mobile: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  department?: DepartmentShape | null;
  site?: SiteShape | null;
  managerSiteIds?: unknown;
  managerSites?: SiteShape[];
};

export function serializeDepartment(department: DepartmentShape) {
  return {
    _id: department.id,
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description || "",
    isActive: department.isActive ?? true,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  };
}

export function serializeSite(site: SiteShape) {
  return {
    _id: site.id,
    id: site.id,
    name: site.name,
    description: site.description || "",
    region: site.region || "",
    timeZone: site.timeZone || "",
    language: site.language || "",
    doorNumber: site.doorNumber || "",
    street: site.street || "",
    landmark: site.landmark || "",
    city: site.city || "",
    stateProvince: site.stateProvince || "",
    zipPostalCode: site.zipPostalCode || "",
    country: site.country || "",
    email: site.email || "",
    phoneNo: site.phoneNo || "",
    faxNo: site.faxNo || "",
    webUrl: site.webUrl || "",
    isActive: site.isActive ?? true,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

export function serializeCategory(category: CategoryShape) {
  return {
    _id: category.id,
    id: category.id,
    name: category.name,
    description: category.description || "",
    isActive: category.isActive ?? true,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function serializeVendor(vendor: VendorShape) {
  return {
    _id: vendor.id,
    id: vendor.id,
    name: vendor.name,
    contactName: vendor.contactName || "",
    email: vendor.email || "",
    phone: vendor.phone || "",
    website: vendor.website || "",
    address: vendor.address || "",
    notes: vendor.notes || "",
    isActive: vendor.isActive ?? true,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
}

export function serializeProductType(productType: ProductTypeShape) {
  return {
    _id: productType.id,
    id: productType.id,
    name: productType.name,
    type: productType.type,
    isActive: productType.isActive ?? true,
    createdAt: productType.createdAt,
    updatedAt: productType.updatedAt,
    category: productType.category ? serializeCategory(productType.category) : null,
  };
}

export function serializeProduct(product: ProductShape) {
  return {
    _id: product.id,
    id: product.id,
    name: product.name,
    manufacturer: product.manufacturer || "",
    partNo: product.partNo || "",
    cost: product.cost ?? null,
    sku: product.sku || "",
    description: product.description || "",
    modelNumber: product.modelNumber || "",
    defaultWarrantyMonths: product.defaultWarrantyMonths ?? null,
    isActive: product.isActive ?? true,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    category: product.category ? serializeCategory(product.category) : null,
    vendor: product.vendor ? serializeVendor(product.vendor) : null,
    productType: product.productType ? serializeProductType(product.productType) : null,
  };
}

export function serializeUser(user: UserShape) {
  const managerSiteIds = Array.isArray(user.managerSiteIds)
    ? user.managerSiteIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  return {
    _id: user.id,
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    displayName: user.displayName || "",
    employeeId: user.employeeId || "",
    description: user.description || "",
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    mobile: user.mobile || "",
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    department: user.department ? serializeDepartment(user.department) : null,
    site: user.site ? serializeSite(user.site) : null,
    managerSiteIds,
    managerSites: Array.isArray(user.managerSites)
      ? user.managerSites.map((site) => serializeSite(site))
      : [],
  };
}

export function fromPrismaAssetState(value: string): string {
  if (value === "InStore") return "In Store";
  if (value === "UnderRepair") return "Under Repair";
  return value;
}

export function toPrismaAssetState(value: string): string {
  if (value === "In Store") return "InStore";
  if (value === "Under Repair") return "UnderRepair";
  return value;
}

export function serializeAsset(asset: AssetShape) {
  return {
    _id: asset.id,
    id: asset.id,
    name: asset.name,
    assetTag: asset.assetTag,
    quantity: asset.quantity ?? 0,
    serialNumber: asset.serialNumber || "",
    purchaseCost: asset.purchaseCost ?? null,
    acquisitionDate: asset.acquisitionDate,
    expiryDate: asset.expiryDate,
    warrantyExpiryDate: asset.warrantyExpiryDate,
    barcodeQr: asset.barcodeQr || "",
    location: asset.location || "",
    assetState: fromPrismaAssetState(asset.assetState),
    retainSite: asset.retainSite ?? false,
    stateComments: asset.stateComments || "",
    isNewDevice: asset.isNewDevice ?? true,
    assetCheck: asset.assetCheck || "",
    comment: asset.comment || "",
    comment2: asset.comment2 || "",
    conditionTag: asset.conditionTag || "",
    grade: asset.grade || "",
    cell: asset.cell || "",
    devicePurchase: asset.devicePurchase || "",
    lastSeen: asset.lastSeen,
    numAuthDevices: asset.numAuthDevices ?? null,
    disposalApprovalPending: asset.disposalApprovalPending ?? false,
    disposalApprovalRequestedAt: asset.disposalApprovalRequestedAt ?? null,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    product: asset.product ? serializeProduct(asset.product) : null,
    vendor: asset.vendor ? serializeVendor(asset.vendor) : null,
    department: asset.department ? serializeDepartment(asset.department) : null,
    site: asset.site ? serializeSite(asset.site) : null,
    assignedTo: asset.assignedTo
      ? {
          _id: asset.assignedTo.id,
          id: asset.assignedTo.id,
          name: `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`.trim(),
          email: asset.assignedTo.email,
        }
      : null,
    associatedToIds: Array.isArray(asset.associatedToIds)
      ? asset.associatedToIds.filter((id): id is string => typeof id === "string")
      : [],
    createdBy: asset.createdBy
      ? {
          _id: asset.createdBy.id,
          id: asset.createdBy.id,
          name: `${asset.createdBy.firstName} ${asset.createdBy.lastName}`.trim(),
        }
      : null,
  };
}

export function serializeReportFolder(folder: ReportFolderShape) {
  return {
    _id: folder.id,
    id: folder.id,
    name: folder.name,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    createdBy: folder.createdBy
      ? {
          _id: folder.createdBy.id,
          id: folder.createdBy.id,
          name: `${folder.createdBy.firstName} ${folder.createdBy.lastName}`.trim(),
        }
      : null,
  };
}

export function serializeReport(report: ReportShape) {
  return {
    _id: report.id,
    id: report.id,
    title: report.title,
    reportType: report.reportType,
    module: report.module,
    subModule: report.subModule,
    selectedColumns: report.selectedColumns,
    filters: report.filters,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    folder: report.folder ? serializeReportFolder(report.folder) : null,
    createdBy: report.createdBy
      ? {
          _id: report.createdBy.id,
          id: report.createdBy.id,
          name: `${report.createdBy.firstName} ${report.createdBy.lastName}`.trim(),
        }
      : null,
  };
}
