import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  // Personal
  firstName: string;
  lastName: string;
  displayName?: string;
  employeeId?: string;
  description?: string;
  // Auth
  email: string;
  password: string;
  role: "admin" | "manager" | "staff";
  // Contact
  phone?: string;
  mobile?: string;
  // Department & Site
  department?: mongoose.Types.ObjectId;
  site?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true, default: "" },
    employeeId: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["admin", "manager", "staff"], default: "staff" },
    phone: { type: String, trim: true, default: "" },
    mobile: { type: String, trim: true, default: "" },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    site: { type: Schema.Types.ObjectId, ref: "Site", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Virtual: full name for backwards compat
UserSchema.virtual("name").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  return obj;
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
