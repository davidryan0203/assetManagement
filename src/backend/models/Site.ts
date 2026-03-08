import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISite extends Document {
  name: string;
  description?: string;
  region?: string;
  timeZone?: string;
  language?: string;
  // Address
  doorNumber?: string;
  street?: string;
  landmark?: string;
  city?: string;
  stateProvince?: string;
  zipPostalCode?: string;
  country?: string;
  // Contact
  email?: string;
  phoneNo?: string;
  faxNo?: string;
  webUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSchema = new Schema<ISite>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true, default: "" },
    region: { type: String, trim: true, default: "" },
    timeZone: { type: String, trim: true, default: "" },
    language: { type: String, trim: true, default: "" },
    doorNumber: { type: String, trim: true, default: "" },
    street: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    stateProvince: { type: String, trim: true, default: "" },
    zipPostalCode: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "USA" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phoneNo: { type: String, trim: true, default: "" },
    faxNo: { type: String, trim: true, default: "" },
    webUrl: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Site: Model<ISite> =
  mongoose.models.Site || mongoose.model<ISite>("Site", SiteSchema);

export default Site;
