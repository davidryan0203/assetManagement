import mongoose, { Document, Model, Schema } from "mongoose";

export type ReportType = "Tabular" | "Matrix" | "Summary" | "Scan";

export interface IFilterRule {
  field: string;       // e.g. "site.name"
  operator: string;    // e.g. "is", "contains", "is_not"
  value: string;
}

export interface ISelectedColumn {
  key: string;    // field path, e.g. "assetTag"
  label: string;  // display label, e.g. "Asset Tag"
}

export interface IReport extends Document {
  title: string;
  reportType: ReportType;
  module: string;         // e.g. "Assets"
  subModule: string;      // e.g. "Chromebook" (category name for Assets)
  selectedColumns: ISelectedColumn[];
  filters: IFilterRule[];
  folder?: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FilterRuleSchema = new Schema<IFilterRule>(
  {
    field: { type: String, required: true },
    operator: { type: String, required: true, default: "is" },
    value: { type: String, default: "" },
  },
  { _id: false }
);

const SelectedColumnSchema = new Schema<ISelectedColumn>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const ReportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true, trim: true },
    reportType: {
      type: String,
      enum: ["Tabular", "Matrix", "Summary", "Scan"],
      default: "Tabular",
    },
    module: { type: String, required: true },
    subModule: { type: String, required: true },
    selectedColumns: { type: [SelectedColumnSchema], default: [] },
    filters: { type: [FilterRuleSchema], default: [] },
    folder: { type: Schema.Types.ObjectId, ref: "ReportFolder", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

export default Report;
