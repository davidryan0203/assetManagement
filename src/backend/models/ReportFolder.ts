import mongoose, { Document, Model, Schema } from "mongoose";

export interface IReportFolder extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReportFolderSchema = new Schema<IReportFolder>(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const ReportFolder: Model<IReportFolder> =
  mongoose.models.ReportFolder ||
  mongoose.model<IReportFolder>("ReportFolder", ReportFolderSchema);

export default ReportFolder;
