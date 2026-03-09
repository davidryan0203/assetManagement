import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProductType extends Document {
  name: string;
  category: mongoose.Types.ObjectId;
  type: "Asset" | "Consumable";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductTypeSchema = new Schema<IProductType>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    type: { type: String, enum: ["Asset", "Consumable"], required: true, default: "Asset" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ProductType: Model<IProductType> =
  mongoose.models.ProductType ||
  mongoose.model<IProductType>("ProductType", ProductTypeSchema);

export default ProductType;
