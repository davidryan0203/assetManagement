"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@backend/lib/api";
import toast from "react-hot-toast";
import { FiArrowLeft, FiChevronUp, FiChevronDown, FiX, FiPlus, FiPlay } from "react-icons/fi";
import { REPORT_MODULES, FILTER_OPERATORS, getModuleDef } from "@backend/lib/reportConfig";

interface SelectedColumn { key: string; label: string; }
interface FilterRule { field: string; operator: string; value: string; }
interface SiteOption { _id?: string; id?: string; name: string; }
interface CategoryOption { _id?: string; id?: string; name: string; }
interface ProductTypeOption { _id?: string; id?: string; name: string; }
interface VendorOption { _id?: string; id?: string; name: string; }
interface DepartmentOption { _id?: string; id?: string; name: string; }
interface ProductOption { _id?: string; id?: string; name: string; }
interface UserOption { _id?: string; id?: string; name?: string; firstName?: string; lastName?: string; }

const ASSET_FILTER_FIELDS: SelectedColumn[] = [
  { key: "assetState", label: "State" },
  { key: "acquisitionDate", label: "Acquisition Date" },
  { key: "product.name", label: "Product" },
  { key: "product.category.name", label: "Product Type" },
  { key: "site.name", label: "Site" },
  { key: "department.name", label: "Department" },
  { key: "assignedTo.name", label: "User" },
];

const ASSET_STATE_OPTIONS = [
  "In Store",
  "Assigned",
  "Under Repair",
  "Retired",
  "Disposed",
  "Lost",
  "Missing",
];

function WizardContent() {
  const router = useRouter();
  const params = useSearchParams();
  const reportId = params.get("id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Report meta
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("");
  const [subModule, setSubModule] = useState("");
  const [reportType, setReportType] = useState("Tabular");

  // Columns
  const [selectedColumns, setSelectedColumns] = useState<SelectedColumn[]>([]);
  const [columnSearch, setColumnSearch] = useState("");

  // Filters
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const moduleDef = getModuleDef(module);
  const availableColumns = moduleDef?.columns ?? [];

  const filteredAvailCols = columnSearch
    ? availableColumns.filter((c) => c.label.toLowerCase().includes(columnSearch.toLowerCase()))
    : availableColumns;

  const selectedKeys = new Set(selectedColumns.map((c) => c.key));
  const filterFieldOptions = module === "Assets" ? ASSET_FILTER_FIELDS : availableColumns;

  useEffect(() => {
    if (!reportId) { router.push("/dashboard/reports/new"); return; }
    api.get(`/reports/${reportId}`).then((res) => {
      const r = res.data.report;
      setTitle(r.title);
      setModule(r.module);
      setSubModule(r.subModule);
      setReportType(r.reportType);
      setSelectedColumns(r.selectedColumns || []);
      setFilters(r.filters || []);
    }).catch(() => {
      toast.error("Failed to load report");
      router.push("/dashboard/reports");
    }).finally(() => setLoading(false));
  }, [reportId, router]);

  useEffect(() => {
    Promise.all([
      api.get("/sites").catch(() => ({ data: { sites: [] } })),
      api.get("/categories").catch(() => ({ data: { categories: [] } })),
      api.get("/product-types").catch(() => ({ data: { productTypes: [] } })),
      api.get("/vendors").catch(() => ({ data: { vendors: [] } })),
      api.get("/departments").catch(() => ({ data: { departments: [] } })),
      api.get("/products").catch(() => ({ data: { products: [] } })),
      api.get("/users").catch(() => ({ data: { users: [] } })),
    ]).then(([sitesRes, categoriesRes, productTypesRes, vendorsRes, departmentsRes, productsRes, usersRes]) => {
      setSites(sitesRes.data?.sites || []);
      setCategories(categoriesRes.data?.categories || []);
      setProductTypes(productTypesRes.data?.productTypes || []);
      setVendors(vendorsRes.data?.vendors || []);
      setDepartments(departmentsRes.data?.departments || []);
      setProducts(productsRes.data?.products || []);
      setUsers(usersRes.data?.users || []);
    });
  }, []);

  const toggleColumn = (key: string, label: string) => {
    if (selectedKeys.has(key)) {
      setSelectedColumns((prev) => prev.filter((c) => c.key !== key));
    } else {
      setSelectedColumns((prev) => [...prev, { key, label }]);
    }
  };

  const moveColumn = (index: number, dir: -1 | 1) => {
    const newCols = [...selectedColumns];
    const target = index + dir;
    if (target < 0 || target >= newCols.length) return;
    [newCols[index], newCols[target]] = [newCols[target], newCols[index]];
    setSelectedColumns(newCols);
  };

  const addFilter = () => {
    const firstCol = filterFieldOptions[0];
    setFilters((prev) => [...prev, {
      field: firstCol?.key ?? "",
      operator: "is",
      value: "",
    }]);
  };

  const updateFilter = (index: number, key: keyof FilterRule, value: string) => {
    setFilters((prev) => prev.map((f, i) => {
      if (i !== index) return f;
      if (key === "field") {
        // Reset stale value when switching to a different filter field.
        return { ...f, field: value, value: "" };
      }
      return { ...f, [key]: value };
    }));
  };

  const getFilterValueOptions = (field: string): string[] => {
    if (field === "site.name") {
      return sites.map((site) => site.name).filter(Boolean);
    }

    if (field === "product.category.name" || field === "category.name") {
      const values = [
        ...productTypes.map((productType) => productType.name),
        ...categories.map((category) => category.name),
      ].filter(Boolean);
      return Array.from(new Set(values));
    }

    if (field === "product.name") {
      return products.map((product) => product.name).filter(Boolean);
    }

    if (field === "vendor.name" || field === "product.vendor.name") {
      return vendors.map((vendor) => vendor.name).filter(Boolean);
    }

    if (field === "department.name") {
      return departments.map((department) => department.name).filter(Boolean);
    }

    if (field === "assetState") {
      return ASSET_STATE_OPTIONS;
    }

    if (field === "assignedTo.name") {
      return users
        .map((user) => user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim())
        .filter(Boolean);
    }

    return [];
  };

  const removeFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/reports/${reportId}`, {
        title, reportType, module, subModule,
        selectedColumns, filters,
      });
      toast.success("Report saved");
    } catch {
      toast.error("Failed to save report");
    } finally { setSaving(false); }
  };

  const handleRunReport = async () => {
    setSaving(true);
    try {
      await api.put(`/reports/${reportId}`, {
        title, reportType, module, subModule,
        selectedColumns, filters,
      });
      router.push(`/dashboard/reports/preview?id=${reportId}`);
    } catch {
      toast.error("Failed to save report before running");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/reports")}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <FiArrowLeft />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Custom Reports</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">Report Title</span>
              <span className="text-gray-300">|</span>
              <span>{title}</span>
              <span className="text-gray-300">|</span>
              <span>Type</span>
              <span className="text-gray-300">|</span>
              <span>{reportType} Reports</span>
              <span className="text-gray-300">|</span>
              <span>Module</span>
              <span className="text-gray-300">|</span>
              <span>{module}{subModule && subModule !== "All" ? ` / ${subModule}` : ""}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-secondary">
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleRunReport}
            disabled={saving}
            className="btn-primary flex items-center gap-2">
            <FiPlay className="w-4 h-4" />
            {saving ? "Running..." : "Run Report"}
          </button>
        </div>
      </div>

      {/* Step 1 – Select columns */}
      <SectionCard
        number={1}
        title="Select columns to display"
        defaultOpen>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left – Available columns */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Choose Columns</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={columnSearch}
                  onChange={(e) => setColumnSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto max-h-72">
                {filteredAvailCols.map((col) => (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${selectedKeys.has(col.key) ? "text-primary-600 bg-primary-50/50" : "text-gray-700"}`}>
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(col.key)}
                      onChange={() => toggleColumn(col.key, col.label)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right – Selected columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                Selected Columns
                {selectedColumns.length > 0 && (
                  <span className="ml-1.5 text-xs text-gray-400">{selectedColumns.length}</span>
                )}
              </h4>
              {selectedColumns.length > 0 && (
                <button
                  className="text-xs text-red-500 hover:text-red-700"
                  onClick={() => setSelectedColumns([])}>
                  Remove selected columns
                </button>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden min-h-[12rem]">
              {selectedColumns.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-gray-400 italic">
                  No columns selected
                </div>
              ) : (
                <div className="overflow-y-auto max-h-72">
                  {selectedColumns.map((col, idx) => (
                    <div
                      key={col.key}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <span className="flex-1 text-primary-700 font-medium">{col.label}</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => moveColumn(idx, -1)} disabled={idx === 0}
                          className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                          <FiChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveColumn(idx, 1)} disabled={idx === selectedColumns.length - 1}
                          className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                          <FiChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleColumn(col.key, col.label)}
                          className="p-1 text-gray-300 hover:text-red-500">
                          <FiX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Step 2 – Filter Options */}
      <SectionCard number={2} title="Filter Options">
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Build custom query filters to narrow down report results.</p>

          {filters.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No filters added. Click below to add a filter.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Advanced Filter</p>
              {filters.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  {/* Field picker */}
                  <select
                    className="input-field text-sm py-1.5 sm:w-48"
                    value={f.field}
                    onChange={(e) => updateFilter(idx, "field", e.target.value)}>
                    {filterFieldOptions.map((col) => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                  </select>
                  {/* Operator */}
                  <select
                    className="input-field text-sm py-1.5 sm:w-32"
                    value={f.operator}
                    onChange={(e) => updateFilter(idx, "operator", e.target.value)}>
                    {FILTER_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  {/* Value */}
                  {f.field === "acquisitionDate" ? (
                    <input
                      type="date"
                      className="input-field text-sm py-1.5 flex-1 min-w-32"
                      value={f.value}
                      onChange={(e) => updateFilter(idx, "value", e.target.value)}
                    />
                  ) : getFilterValueOptions(f.field).length > 0 ? (
                    <select
                      className="input-field text-sm py-1.5 flex-1 min-w-32"
                      value={f.value}
                      onChange={(e) => updateFilter(idx, "value", e.target.value)}>
                      <option value="">-- Select Value --</option>
                      {getFilterValueOptions(f.field).map((optionValue) => (
                        <option key={optionValue} value={optionValue}>{optionValue}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input-field text-sm py-1.5 flex-1 min-w-32"
                      value={f.value}
                      onChange={(e) => updateFilter(idx, "value", e.target.value)}
                      placeholder="Value..."
                    />
                  )}
                  <button
                    onClick={() => removeFilter(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addFilter}
            className="btn-secondary text-sm flex items-center gap-1.5 mt-2">
            <FiPlus className="w-4 h-4" /> Add Filter
          </button>
        </div>
      </SectionCard>

      {/* Bottom run button */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button onClick={() => router.push("/dashboard/reports")} className="btn-secondary">Cancel</button>
        <button onClick={handleRunReport} disabled={saving} className="btn-primary flex items-center gap-2">
          <FiPlay className="w-4 h-4" />
          {saving ? "Running..." : "Run Report"}
        </button>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  number, title, children, defaultOpen = false,
}: { number: number; title: string; children?: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors">
        <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <span className="font-medium text-gray-800 flex-1">{title}</span>
        {open ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
      </button>
      {open && children && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    }>
      <WizardContent />
    </Suspense>
  );
}
