"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@backend/lib/api";
import toast from "react-hot-toast";
import { FiArrowLeft, FiPrinter, FiDownload, FiEdit2, FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface SelectedColumn { key: string; label: string; }

interface ReportMeta {
  _id: string;
  title: string;
  reportType: string;
  module: string;
  subModule: string;
  selectedColumns: SelectedColumn[];
}

const PAGE_SIZE = 50;

function PreviewContent() {
  const router = useRouter();
  const params = useSearchParams();
  const reportId = params.get("id");
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportMeta | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const columns = report?.selectedColumns ?? [];
  const displayCols = columns.length > 0 ? columns : getDefaultColumns(report?.module ?? "");

  useEffect(() => {
    if (!reportId) { router.push("/dashboard/reports"); return; }
    setLoading(true);
    api.get(`/reports/${reportId}/run`)
      .then((res) => {
        setReport(res.data.report);
        setRows(res.data.rows);
        setTotal(res.data.total);
      })
      .catch(() => toast.error("Failed to run report"))
      .finally(() => setLoading(false));
  }, [reportId, router]);

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    if (!report) return;
    const headers = displayCols.map((c) => c.label);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        displayCols.map((c) => {
          const val = String(row[c.key] ?? "").replace(/"/g, '\"');
          return `"${val}"`;
        }).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const exportXLSX = () => {
    if (!report) return;
    // Build a simple TSV that Excel can open
    const headers = displayCols.map((c) => c.label);
    const tsvRows = [
      headers.join("\t"),
      ...rows.map((row) =>
        displayCols.map((c) => String(row[c.key] ?? "")).join("\t")
      ),
    ];
    const blob = new Blob([tsvRows.join("\n")], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "_")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel file exported");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/reports")}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <FiArrowLeft />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {report ? "Unsaved Report" : "Report Preview"}
            </h2>
            <p className="text-xs text-gray-400">
              {report?.module} / {report?.subModule} — {total} record{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {report && (
            <button
              onClick={() => router.push(`/dashboard/reports/wizard?id=${report._id}`)}
              className="btn-secondary flex items-center gap-2 text-sm">
              <FiEdit2 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
            <FiPrinter className="w-3.5 h-3.5" /> Print Preview
          </button>
          <div className="relative group">
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <FiDownload className="w-3.5 h-3.5" /> Export as
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block min-w-[120px]">
              <button onClick={exportCSV} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                CSV
              </button>
              <button onClick={exportXLSX} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100">
                XLSX
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable report area */}
      <div ref={printRef} className="card overflow-hidden print:shadow-none print:border-0">
        {/* Report header (visible in print) */}
        <div className="p-6 border-b border-gray-100 print:p-4">
          <div className="print:block">
            <div className="hidden print:block mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{report?.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Generated on: {new Date().toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 font-semibold mt-1">
                Total records: {total.toLocaleString()}
              </p>
            </div>
            <div className="print:hidden flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">{report?.title}</p>
                <p className="text-xs text-gray-400">
                  Generated on: {new Date().toLocaleString()} &nbsp;·&nbsp;
                  Total records: <span className="font-semibold text-gray-600">{total.toLocaleString()}</span>
                </p>
              </div>
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                    <FiChevronLeft />
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                    <FiChevronRight />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {displayCols.length === 0 || rows.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="font-medium">No data to display</p>
              <p className="text-sm mt-1">
                {rows.length === 0
                  ? "No records matched the report criteria."
                  : "Select columns in the wizard to display data."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {displayCols.map((col) => (
                    <th key={col.key} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors print:hover:bg-transparent">
                    {displayCols.map((col) => (
                      <td key={col.key} className="py-3 px-4 text-gray-700 whitespace-nowrap">
                        {String(row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="print:hidden flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} records
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">First</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <FiChevronLeft />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <FiChevronRight />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40">Last</button>
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .card, .card * { visibility: visible; }
          .card { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function getDefaultColumns(module: string): SelectedColumn[] {
  if (module === "Assets") {
    return [
      { key: "assetTag", label: "Asset Tag" },
      { key: "assignedTo.name", label: "User" },
      { key: "name", label: "Name" },
      { key: "product.category.name", label: "Product Type" },
    ];
  }
  return [{ key: "name", label: "Name" }];
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
