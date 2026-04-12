"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@backend/lib/api";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiChevronDown,
  FiCheckCircle,
  FiClock,
  FiMaximize2,
  FiPackage,
  FiRefreshCcw,
  FiTool,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { Doughnut } from "react-chartjs-2";
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface AssetChartItem {
  _id: string;
  name: string;
  assetTag: string;
  assetState: string;
  createdAt: string;
  purchaseCost?: number | null;
  assignedTo?: { name: string } | null;
  department?: { name: string } | null;
  site?: { name: string } | null;
  product?: { category?: { name?: string | null } | null } | null;
}

type Slice = { label: string; value: number; color: string };

type ChartKind = "status" | "department";

interface ChartPanelState {
  kind: ChartKind;
  title: string;
  subtitle: string;
}

const STATUS_COLORS: Record<string, string> = {
  "In Store": "#22c55e",
  Assigned: "#3b82f6",
  "Under Repair": "#f59e0b",
  Retired: "#64748b",
  Disposed: "#ef4444",
  Lost: "#a855f7",
  Missing: "#14b8a6",
};

const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#22c55e", "#06b6d4", "#ef4444", "#eab308"];

const METRIC_COLORS = {
  total: "bg-slate-500",
  available: "bg-emerald-500",
  assigned: "bg-blue-500",
  repair: "bg-amber-500",
  retired: "bg-slate-400",
};

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  delta?: number;
  deltaLabel?: string;
}

function MetricCard({ label, value, icon, colorClass, delta, deltaLabel }: MetricCardProps) {
  const deltaColor = delta == null ? "text-gray-400" : delta >= 0 ? "text-emerald-600" : "text-rose-600";

  return (
    <div className="card p-5 rounded-2xl shadow-sm border border-gray-100 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value.toLocaleString()}</p>
          {delta !== undefined && (
            <p className={`mt-2 text-xs font-medium ${deltaColor}`}>
              {delta >= 0 ? "+" : ""}{delta.toLocaleString()} {deltaLabel ?? "vs previous period"}
            </p>
          )}
        </div>
        <div className={`h-11 w-11 rounded-xl ${colorClass} text-white flex items-center justify-center text-lg shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  onExpand,
  children,
}: {
  title: string;
  subtitle: string;
  onExpand: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card rounded-2xl border border-gray-100 bg-white shadow-sm p-5 h-full">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onExpand}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <FiMaximize2 className="w-3.5 h-3.5" />
          Expand
        </button>
      </div>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card rounded-2xl border border-gray-100 bg-white shadow-sm p-5 h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function DonutChart({ slices, total }: { slices: Slice[]; total: number }) {
  if (total === 0) {
    return <div className="h-56 flex items-center justify-center text-sm text-gray-400">No data for selected dates.</div>;
  }

  const data = {
    labels: slices.map((slice) => slice.label),
    datasets: [
      {
        data: slices.map((slice) => slice.value),
        backgroundColor: slices.map((slice) => slice.color),
        borderWidth: 0,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "58%",
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10,
          padding: 16,
        },
        onClick: (event: unknown, legendItem: { index?: number }, legend: { chart: ChartJS }) => {
          const index = legendItem.index;
          if (typeof index !== "number") return;
          const chart = legend.chart;
          chart.toggleDataVisibility(index);
          chart.update();
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { label?: string; parsed: number }) => `${context.label ?? ""}: ${context.parsed.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="relative h-72">
      <Doughnut data={data} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-gray-500">Total</span>
        <span className="text-2xl font-semibold text-gray-900">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function ChartsPage() {
  const [assets, setAssets] = useState<AssetChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => formatDateInput(addDays(new Date(), -30)));
  const [dateTo, setDateTo] = useState(() => formatDateInput(new Date()));

  useEffect(() => {
    api.get("/assets")
      .then((res) => setAssets(res.data.assets || []))
      .catch(() => toast.error("Failed to load chart data"))
      .finally(() => setLoading(false));
  }, []);

  const range = useMemo(() => normalizeRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const previousRange = useMemo(() => getPreviousRange(range.from, range.to), [range.from, range.to]);

  const currentAssets = useMemo(
    () => assets.filter((asset) => isWithinRange(asset.createdAt, range.from, range.to)),
    [assets, range.from, range.to]
  );

  const previousAssets = useMemo(
    () => assets.filter((asset) => isWithinRange(asset.createdAt, previousRange.from, previousRange.to)),
    [assets, previousRange.from, previousRange.to]
  );

  const currentTotals = useMemo(() => summarizeAssets(currentAssets), [currentAssets]);
  const previousTotals = useMemo(() => summarizeAssets(previousAssets), [previousAssets]);

  const statusBreakdown = useMemo<Slice[]>(() => buildBreakdown(currentAssets, (asset) => asset.assetState, STATUS_COLORS), [currentAssets]);
  const departmentBreakdown = useMemo<Slice[]>(() => buildBreakdown(currentAssets, (asset) => asset.department?.name || "Unassigned", CATEGORY_COLORS), [currentAssets]);
  const categoryAvailabilityRows = useMemo(() => buildAvailabilityRows(currentAssets), [currentAssets]);
  const [expandedChart, setExpandedChart] = useState<ChartPanelState | null>(null);

  const comparison = {
    total: currentTotals.total - previousTotals.total,
    available: currentTotals.available - previousTotals.available,
    assigned: currentTotals.assigned - previousTotals.assigned,
    repair: currentTotals.repair - previousTotals.repair,
    retired: currentTotals.retired - previousTotals.retired,
  };

  const currentRangeLabel = `${formatDisplayDate(range.from)} → ${formatDisplayDate(range.to)}`;
  const previousRangeLabel = `${formatDisplayDate(previousRange.from)} → ${formatDisplayDate(previousRange.to)}`;

  const chartPanelSubtitle = expandedChart?.subtitle || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Analytics</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Charts</h1>
          <p className="text-sm text-gray-500 mt-2">
            Asset-based charts for the selected date range. Comparing <span className="font-medium text-gray-700">{currentRangeLabel}</span> with <span className="font-medium text-gray-700">{previousRangeLabel}</span>.
          </p>
        </div>

        <div className="card rounded-2xl border border-gray-100 bg-white shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span className="flex items-center gap-2 font-medium text-gray-700"><FiCalendar /> Date from</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field min-w-[10rem]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span className="flex items-center gap-2 font-medium text-gray-700"><FiCalendar /> Date to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field min-w-[10rem]"
            />
          </label>
          <button
            onClick={() => {
              setDateFrom(formatDateInput(addDays(new Date(), -30)));
              setDateTo(formatDateInput(new Date()));
            }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <FiRefreshCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Assets"
          value={currentTotals.total}
          icon={<FiPackage />}
          colorClass={METRIC_COLORS.total}
          delta={comparison.total}
        />
        <MetricCard
          label="Available"
          value={currentTotals.available}
          icon={<FiCheckCircle />}
          colorClass={METRIC_COLORS.available}
          delta={comparison.available}
        />
        <MetricCard
          label="Assigned"
          value={currentTotals.assigned}
          icon={<FiUsers />}
          colorClass={METRIC_COLORS.assigned}
          delta={comparison.assigned}
        />
        <MetricCard
          label="Under Repair"
          value={currentTotals.repair}
          icon={<FiTool />}
          colorClass={METRIC_COLORS.repair}
          delta={comparison.repair}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Retired"
          value={currentTotals.retired}
          icon={<FiClock />}
          colorClass={METRIC_COLORS.retired}
          delta={comparison.retired}
        />
        <div className="card rounded-2xl border border-gray-100 bg-white shadow-sm p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Range comparison</h3>
              <p className="text-sm text-gray-500 mt-1">Current range versus the immediately previous date window of the same length.</p>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <FiTrendingUp className="text-primary-500" />
              Current: <span className="font-semibold text-gray-800">{currentTotals.total}</span>
              <span className="mx-1">/</span>
              Previous: <span className="font-semibold text-gray-800">{previousTotals.total}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Total", current: currentTotals.total, previous: previousTotals.total },
              { label: "Available", current: currentTotals.available, previous: previousTotals.available },
              { label: "Assigned", current: currentTotals.assigned, previous: previousTotals.assigned },
              { label: "Repair", current: currentTotals.repair, previous: previousTotals.repair },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className="mt-1 font-semibold text-gray-900">{item.current}</p>
                <p className="text-xs text-gray-500">Previous: {item.previous}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Assets by Status"
          subtitle="Current inventory state breakdown within the selected range."
          onExpand={() => setExpandedChart({ kind: "status", title: "Assets by Status", subtitle: "Current inventory state breakdown within the selected range." })}
        >
          <DonutChart slices={statusBreakdown} total={currentTotals.total} />
        </ChartCard>

        <ChartCard
          title="Assets by Department"
          subtitle="Where assets are most concentrated."
          onExpand={() => setExpandedChart({ kind: "department", title: "Assets by Department", subtitle: "Where assets are most concentrated." })}
        >
          <DonutChart slices={departmentBreakdown} total={currentTotals.total} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <SectionCard title="Availability by Category" subtitle="Useful for spotting where available assets are concentrated.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 px-2">Category</th>
                  <th className="py-2 px-2">Total</th>
                  <th className="py-2 px-2">Available</th>
                  <th className="py-2 px-2">Assigned</th>
                  <th className="py-2 px-2">Repair</th>
                </tr>
              </thead>
              <tbody>
                {categoryAvailabilityRows.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-gray-400" colSpan={5}>
                      No data for selected dates.
                    </td>
                  </tr>
                ) : (
                  categoryAvailabilityRows.map((row) => (
                    <tr key={row.label} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 px-2 font-medium text-gray-800">{row.label}</td>
                      <td className="py-3 px-2 text-gray-600">{row.total}</td>
                      <td className="py-3 px-2 text-gray-600">{row.available}</td>
                      <td className="py-3 px-2 text-gray-600">{row.assigned}</td>
                      <td className="py-3 px-2 text-gray-600">{row.repair}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

      </div>

      {expandedChart && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setExpandedChart(null)}>
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{expandedChart.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{chartPanelSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedChart(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <FiChevronDown className="rotate-180" /> Close
              </button>
            </div>
            <div className="p-5">
              {expandedChart.kind === "status" && <DonutChart slices={statusBreakdown} total={currentTotals.total} />}
              {expandedChart.kind === "department" && <DonutChart slices={departmentBreakdown} total={currentTotals.total} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function summarizeAssets(items: AssetChartItem[]) {
  return {
    total: items.length,
    available: items.filter((item) => item.assetState === "In Store").length,
    assigned: items.filter((item) => item.assetState === "Assigned").length,
    repair: items.filter((item) => item.assetState === "Under Repair").length,
    retired: items.filter((item) => item.assetState === "Retired").length,
  };
}

function buildBreakdown(
  items: AssetChartItem[],
  keyFn: (item: AssetChartItem) => string,
  palette: string[] | Record<string, string>
): Slice[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = keyFn(item) || "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 6);
  const rest = entries.slice(6).reduce((sum, [, count]) => sum + count, 0);
  const finalEntries = rest > 0 ? [...top, ["Other", rest] as const] : top;

  return finalEntries
    .map(([label, value], index) => ({
      label,
      value,
      color: Array.isArray(palette)
        ? palette[index % palette.length]
        : palette[label] || palette["Other"] || "#94a3b8",
    }))
    .filter((item) => item.value > 0);
}

function buildAvailabilityRows(items: AssetChartItem[]) {
  const buckets = new Map<string, { total: number; available: number; assigned: number; repair: number }>();

  for (const item of items) {
    const label = item.product?.category?.name || "Uncategorized";
    const bucket = buckets.get(label) ?? { total: 0, available: 0, assigned: 0, repair: 0 };
    bucket.total += 1;
    if (item.assetState === "In Store") bucket.available += 1;
    if (item.assetState === "Assigned") bucket.assigned += 1;
    if (item.assetState === "Under Repair") bucket.repair += 1;
    buckets.set(label, bucket);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([label, bucket]) => ({ label, ...bucket }));
}

function normalizeRange(from: string, to: string) {
  const start = startOfDay(new Date(`${from}T00:00:00`));
  const end = endOfDay(new Date(`${to}T00:00:00`));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const fallbackTo = endOfDay(new Date());
    const fallbackFrom = startOfDay(addDays(fallbackTo, -30));
    return { from: fallbackFrom, to: fallbackTo };
  }

  if (start <= end) return { from: start, to: end };
  return { from: endOfDay(end), to: startOfDay(start) };
}

function getPreviousRange(from: Date, to: Date) {
  const spanDays = Math.max(Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1, 1);
  const previousTo = endOfDay(addDays(from, -1));
  const previousFrom = startOfDay(addDays(previousTo, -(spanDays - 1)));
  return { from: previousFrom, to: previousTo };
}

function isWithinRange(value: string | Date, from: Date, to: Date) {
  const date = new Date(value);
  return date >= from && date <= to;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}