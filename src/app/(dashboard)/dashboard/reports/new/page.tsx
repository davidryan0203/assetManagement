"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@backend/lib/api";
import toast from "react-hot-toast";
import { FiArrowLeft, FiChevronRight } from "react-icons/fi";
import { REPORT_MODULES } from "@backend/lib/reportConfig";

const REPORT_TYPES = [
  {
    value: "Tabular",
    label: "Tabular Report",
    description: "Displays data in tables based on user defined criteria. Data can also be grouped based on a table column.",
  },
  {
    value: "Matrix",
    label: "Matrix Report",
    description: "Displays data in a grid format grouped by row and column based on a criteria.",
  },
  {
    value: "Summary",
    label: "Summary Report",
    description: "Displays concise information based on a criteria.",
  },
  {
    value: "Scan",
    label: "Scan Report",
    description: "Displays detailed historical inventory data based on scan time.",
  },
];

export default function NewReportPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("Tabular");
  const [module, setModule] = useState("");
  const [subModule, setSubModule] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedModuleDef = REPORT_MODULES.find((m) => m.value === module);

  const handleProceed = async () => {
    if (!title.trim()) { toast.error("Report title is required"); return; }
    if (!module) { toast.error("Please select a module"); return; }
    if (!subModule) { toast.error("Please select a source module / sub-module"); return; }

    setSaving(true);
    try {
      const res = await api.post("/reports", {
        title: title.trim(),
        reportType,
        module,
        subModule,
        selectedColumns: [],
        filters: [],
      });
      router.push(`/dashboard/reports/wizard?id=${res.data.report._id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to create report");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/reports")}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <FiArrowLeft />
        </button>
        <h2 className="text-xl font-semibold text-gray-900">New Custom Report</h2>
      </div>

      <div className="card p-8 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Title <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chromebook Inventory Summary"
            autoFocus
          />
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Type <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            {REPORT_TYPES.map((rt) => (
              <label key={rt.value} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="reportType"
                  value={rt.value}
                  checked={reportType === rt.value}
                  onChange={() => setReportType(rt.value)}
                  className="mt-1 w-4 h-4 text-primary-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-primary-600 transition-colors">
                    {rt.label}
                  </p>
                  <p className="text-xs text-gray-400">{rt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Module */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={module}
              onChange={(e) => { setModule(e.target.value); setSubModule(""); }}>
              <option value="">-- Select Module --</option>
              {REPORT_MODULES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {module && selectedModuleDef && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Module <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field"
                value={subModule}
                onChange={(e) => setSubModule(e.target.value)}>
                <option value="">-- Select Source Module --</option>
                {selectedModuleDef.subModules.map((sm) => (
                  <option key={sm.value} value={sm.value}>{sm.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => router.push("/dashboard/reports")}
            className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={saving}
            className="btn-primary flex items-center gap-2">
            {saving ? "Creating..." : "Proceed to Report Wizard"}
            <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
