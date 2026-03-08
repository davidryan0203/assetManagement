// Shared report module configuration
// Used by the wizard UI and the run endpoint

export interface ColumnDef {
  key: string;
  label: string;
}

export interface ModuleSubDef {
  label: string;
  value: string;
}

export interface ModuleDef {
  label: string;
  value: string;
  subModules: ModuleSubDef[];
  columns: ColumnDef[];
}

// Operators available for filter rules
export const FILTER_OPERATORS = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
];

export const REPORT_MODULES: ModuleDef[] = [
  {
    label: "Assets",
    value: "Assets",
    subModules: [
      { label: "All", value: "All" },
      { label: "AC Adapter", value: "AC Adapter" },
      { label: "Access Points", value: "Access Points" },
      { label: "Apple Products", value: "Apple Products" },
      { label: "Batteries", value: "Batteries" },
      { label: "Chromebook", value: "Chromebook" },
      { label: "Computer Accessories", value: "Computer Accessories" },
      { label: "Computers", value: "Computers" },
      { label: "Desktop", value: "Desktop" },
      { label: "Laptop", value: "Laptop" },
      { label: "Mobile Devices", value: "Mobile Devices" },
      { label: "Monitors", value: "Monitors" },
      { label: "Network Equipment", value: "Network Equipment" },
      { label: "Printers", value: "Printers" },
      { label: "Servers", value: "Servers" },
      { label: "Tablets", value: "Tablets" },
      { label: "Other IT Equipment", value: "Other IT Equipment" },
    ],
    columns: [
      { key: "assetTag", label: "Asset Tag" },
      { key: "name", label: "Name" },
      { key: "serialNumber", label: "Serial Number" },
      { key: "barcodeQr", label: "Barcode / QR Code" },
      { key: "location", label: "Location" },
      { key: "assetState", label: "State" },
      { key: "purchaseCost", label: "Purchase Cost" },
      { key: "acquisitionDate", label: "Acquisition Date" },
      { key: "expiryDate", label: "Expiry Date" },
      { key: "warrantyExpiryDate", label: "Warranty Expiry Date" },
      { key: "isNewDevice", label: "Is New Device" },
      { key: "stateComments", label: "State Comments" },
      { key: "comment", label: "Comment" },
      { key: "comment2", label: "Comment 2" },
      { key: "conditionTag", label: "Condition Tag" },
      { key: "grade", label: "Grade" },
      { key: "cell", label: "Cell" },
      { key: "devicePurchase", label: "Device Purchase" },
      { key: "lastSeen", label: "Last Seen" },
      { key: "numAuthDevices", label: "Num Auth Devices" },
      { key: "product.name", label: "Product" },
      { key: "product.sku", label: "SKU" },
      { key: "product.category.name", label: "Product Type" },
      { key: "product.vendor.name", label: "Product Manufacturer" },
      { key: "vendor.name", label: "Vendor" },
      { key: "department.name", label: "Department" },
      { key: "department.code", label: "Department Code" },
      { key: "site.name", label: "Site" },
      { key: "assignedTo.name", label: "User" },
      { key: "assignedTo.email", label: "User Email" },
      { key: "associatedTo.assetTag", label: "Associated Asset Tag" },
      { key: "createdBy.name", label: "Created By" },
      { key: "createdAt", label: "Created Time" },
    ],
  },
  {
    label: "Users",
    value: "Users",
    subModules: [
      { label: "All Users", value: "All" },
      { label: "Admin", value: "admin" },
      { label: "Manager", value: "manager" },
      { label: "Staff", value: "staff" },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "department.name", label: "Department" },
      { key: "site.name", label: "Site" },
      { key: "createdAt", label: "Created Time" },
    ],
  },
  {
    label: "Departments",
    value: "Departments",
    subModules: [{ label: "All Departments", value: "All" }],
    columns: [
      { key: "name", label: "Name" },
      { key: "code", label: "Code" },
      { key: "description", label: "Description" },
      { key: "isActive", label: "Is Active" },
      { key: "createdAt", label: "Created Time" },
    ],
  },
  {
    label: "Sites",
    value: "Sites",
    subModules: [{ label: "All Sites", value: "All" }],
    columns: [
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "createdAt", label: "Created Time" },
    ],
  },
  {
    label: "Products",
    value: "Products",
    subModules: [{ label: "All Products", value: "All" }],
    columns: [
      { key: "name", label: "Name" },
      { key: "sku", label: "SKU" },
      { key: "description", label: "Description" },
      { key: "category.name", label: "Category" },
      { key: "vendor.name", label: "Vendor" },
      { key: "createdAt", label: "Created Time" },
    ],
  },
];

export function getModuleDef(module: string): ModuleDef | undefined {
  return REPORT_MODULES.find((m) => m.value === module);
}
