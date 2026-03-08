import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAsset extends Document {
  // Core
  name: string;
  assetTag: string;
  product: mongoose.Types.ObjectId;
  // Asset Details
  serialNumber?: string;
  vendor?: mongoose.Types.ObjectId | null;
  purchaseCost?: number;
  acquisitionDate?: Date;
  expiryDate?: Date;
  warrantyExpiryDate?: Date;
  barcodeQr?: string;
  location?: string;
  // Asset State
  assetState: "In Store" | "In Use" | "Under Repair" | "Retired" | "Disposed" | "Lost" | "Missing";
  assignedTo?: mongoose.Types.ObjectId | null;
  department?: mongoose.Types.ObjectId | null;
  site?: mongoose.Types.ObjectId | null;
  associatedTo?: mongoose.Types.ObjectId | null;
  retainSite: boolean;
  stateComments?: string;
  // Additional Asset Details
  isNewDevice: boolean;
  assetCheck?: string;
  comment?: string;
  comment2?: string;
  conditionTag?: string;
  grade?: string;
  cell?: string;
  devicePurchase?: string;
  lastSeen?: Date;
  numAuthDevices?: number;
  // Meta
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    name: { type: String, required: true, trim: true },
    assetTag: { type: String, required: true, unique: true, trim: true, uppercase: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    // Asset Details
    serialNumber: { type: String, trim: true, default: "" },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    purchaseCost: { type: Number, default: null },
    acquisitionDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    warrantyExpiryDate: { type: Date, default: null },
    barcodeQr: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    // Asset State
    assetState: {
      type: String,
      enum: ["In Store", "In Use", "Under Repair", "Retired", "Disposed", "Lost", "Missing"],
      default: "In Store",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    site: { type: Schema.Types.ObjectId, ref: "Site", default: null },
    associatedTo: { type: Schema.Types.ObjectId, ref: "Asset", default: null },
    retainSite: { type: Boolean, default: false },
    stateComments: { type: String, trim: true, default: "" },
    // Additional Asset Details
    isNewDevice: { type: Boolean, default: true },
    assetCheck: { type: String, trim: true, default: "" },
    comment: { type: String, trim: true, default: "" },
    comment2: { type: String, trim: true, default: "" },
    conditionTag: { type: String, trim: true, default: "" },
    grade: { type: String, trim: true, default: "" },
    cell: { type: String, trim: true, default: "" },
    devicePurchase: { type: String, trim: true, default: "" },
    lastSeen: { type: Date, default: null },
    numAuthDevices: { type: Number, default: null },
    // Meta
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Asset: Model<IAsset> =
  mongoose.models.Asset || mongoose.model<IAsset>("Asset", AssetSchema);

export default Asset;
