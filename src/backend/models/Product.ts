import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProduct extends Document {
  name: string;
  sku?: string;
  category: mongoose.Types.ObjectId;
  vendor?: mongoose.Types.ObjectId | null;
  description?: string;
  modelNumber?: string;
  manufacturer?: string;
  defaultWarrantyMonths?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
    description: { type: String, trim: true, default: "" },
    modelNumber: { type: String, trim: true, default: "" },
    manufacturer: { type: String, trim: true, default: "" },
    defaultWarrantyMonths: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
