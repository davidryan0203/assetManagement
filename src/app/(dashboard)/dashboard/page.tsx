"use client";

import { useEffect, useState } from "react";
import api from "@backend/lib/api";
import { FiBox, FiCheckCircle, FiTool, FiXCircle, FiUsers, FiBriefcase, FiClock, FiMapPin, FiFileText } from "react-icons/fi";
import Link from "next/link";
import { useAuth } from "@frontend/context/AuthContext";
import Modal from "@frontend/components/ui/Modal";

interface Stats {
  totalAssets: number;
  availableAssets: number;
  inUseAssets: number;
  maintenanceAssets: number;
  retiredAssets: number;
  totalUsers: number;
  totalDepartments: number;
}

interface RecentAsset {
  _id: string;
  name: string;
  assetTag: string;
  category: string;
  status: string;
  department?: { name: string };
  assignedTo?: { name: string };
  createdAt: string;
}

interface DashboardAsset {
  _id: string;
  assetTag: string;
  name: string;
  assetState: string;
  expiryDate?: string | null;
  warrantyExpiryDate?: string | null;
  product?: {
    name?: string | null;
    productType?: { type?: string | null } | null;
    category?: { name?: string | null } | null;
    vendor?: { name?: string | null } | null;
  } | null;
  site?: { name?: string | null } | null;
  department?: { name?: string | null } | null;
  assignedTo?: { name?: string | null } | null;
  stateComments?: string | null;
}

interface BreakdownRow {
  label: string;
  value: number;
  color: string;
  assets: DashboardAsset[];
}

interface DrilldownState {
  title: string;
  subtitle: string;
  row: BreakdownRow;
}

const statusClass: Record<string, string> = {
  available: "status-available",
  "in-use": "status-in-use",
  maintenance: "status-maintenance",
  retired: "status-retired",
};

export default function DashboardPage() {
  const MODAL_PAGE_SIZE = 8;
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);
  const [dashboardAssets, setDashboardAssets] = useState<DashboardAsset[]>([]);
  const [drilldown, setDrilldown] = useState<DrilldownState | null>(null);
  const [modalPage, setModalPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard").then((res) => {
      setStats(res.data.stats);
      setRecentAssets(res.data.recentAssets);
      setDashboardAssets(res.data.assets || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setModalPage(1);
  }, [drilldown]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Assets", value: stats?.totalAssets ?? 0, icon: <FiBox />, color: "bg-blue-500", light: "bg-blue-50 text-blue-700" },
    { label: "Available", value: stats?.availableAssets ?? 0, icon: <FiCheckCircle />, color: "bg-green-500", light: "bg-green-50 text-green-700" },
    { label: "In Use", value: stats?.inUseAssets ?? 0, icon: <FiClock />, color: "bg-indigo-500", light: "bg-indigo-50 text-indigo-700" },
    { label: "Maintenance", value: stats?.maintenanceAssets ?? 0, icon: <FiTool />, color: "bg-yellow-500", light: "bg-yellow-50 text-yellow-700" },
    { label: "Retired", value: stats?.retiredAssets ?? 0, icon: <FiXCircle />, color: "bg-red-500", light: "bg-red-50 text-red-700" },
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: <FiUsers />, color: "bg-purple-500", light: "bg-purple-50 text-purple-700" },
    { label: "Departments", value: stats?.totalDepartments ?? 0, icon: <FiBriefcase />, color: "bg-orange-500", light: "bg-orange-50 text-orange-700" },
  ];

  const assetOverview = buildAssetOverview(dashboardAssets);

  const selectedAssets = drilldown?.row.assets ?? [];
  const modalTotalPages = Math.max(1, Math.ceil(selectedAssets.length / MODAL_PAGE_SIZE));
  const safeModalPage = Math.min(modalPage, modalTotalPages);
  const paginatedAssets = selectedAssets.slice(
    (safeModalPage - 1) * MODAL_PAGE_SIZE,
    safeModalPage * MODAL_PAGE_SIZE,
  );
  const modalStart = selectedAssets.length === 0 ? 0 : (safeModalPage - 1) * MODAL_PAGE_SIZE + 1;
  const modalEnd = Math.min(safeModalPage * MODAL_PAGE_SIZE, selectedAssets.length);

  return (
    <div className="space-y-6">
      <Modal
        isOpen={Boolean(drilldown)}
        onClose={() => setDrilldown(null)}
        title={drilldown ? `${drilldown.title} · ${drilldown.row.label}` : "Details"}
        size="2xl"
      >
        {drilldown && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{drilldown.subtitle}</p>
                <p className="text-lg font-semibold text-gray-900">{drilldown.row.label}</p>
              </div>
              <div className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {drilldown.row.value} assets
              </div>
            </div>

            {selectedAssets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                No assets found for this category.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-500">
                        <th className="px-4 py-3 font-medium">Asset Tag</th>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">State</th>
                        <th className="px-4 py-3 font-medium">Site</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAssets.map((asset) => (
                        <tr key={asset._id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">{asset.assetTag}</td>
                          <td className="px-4 py-3 text-gray-900">{asset.product?.name || asset.name}</td>
                          <td className="px-4 py-3 text-gray-600">{asset.product?.category?.name || "—"}</td>
                          <td className="px-4 py-3 text-gray-600">{asset.assetState}</td>
                          <td className="px-4 py-3 text-gray-600">{asset.site?.name || "—"}</td>
                          <td className="px-4 py-3 text-gray-600">{asset.department?.name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {modalStart}-{modalEnd} of {selectedAssets.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalPage((prev) => Math.max(prev - 1, 1))}
                      disabled={safeModalPage <= 1}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {safeModalPage} / {modalTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalPage((prev) => Math.min(prev + 1, modalTotalPages))}
                      disabled={safeModalPage >= modalTotalPages}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Asset Overview - screenshot-inspired summary */}
      <div className="card p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Asset Overview</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">Overview by asset dates and status</h3>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 xl:gap-6">
            <OverviewRing label="Total" value={assetOverview.total} sublabel="Assets" accent="text-sky-600" tone="bg-sky-50" />
            <OverviewRing label="Assigned" value={assetOverview.assigned} sublabel="Assigned" accent="text-emerald-600" tone="bg-emerald-50" />
            <OverviewRing label="In Store" value={assetOverview.inStore} sublabel="Available" accent="text-indigo-600" tone="bg-indigo-50" />
            <OverviewRing label="Repair" value={assetOverview.underRepair} sublabel="Under Repair" accent="text-amber-600" tone="bg-amber-50" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ReportPanel
            title="Support"
            subtitle="Support status"
            total={assetOverview.total}
            percentage={assetOverview.supportGoodPct}
            donutLabel={`${assetOverview.supportGoodPct}%`}
            donutCaption="Good"
            onRowClick={(row) => setDrilldown({ title: "Support", subtitle: "Warranty expiry status", row })}
            rows={[
              { label: "Good", value: assetOverview.supportGood, color: "bg-indigo-400", assets: assetOverview.supportRows.good },
              { label: "Expiring in 90 Days", value: assetOverview.support90, color: "bg-yellow-400", assets: assetOverview.supportRows.days90 },
              { label: "Expiring in 60 Days", value: assetOverview.support60, color: "bg-amber-400", assets: assetOverview.supportRows.days60 },
              { label: "Expiring in 30 Days", value: assetOverview.support30, color: "bg-orange-400", assets: assetOverview.supportRows.days30 },
              { label: "Expired", value: assetOverview.expiredSupport, color: "bg-red-400", assets: assetOverview.supportRows.expired },
              { label: "No Coverage", value: assetOverview.noSupportDate, color: "bg-gray-400", assets: assetOverview.supportRows.none },
            ]}
          />

          <ReportPanel
            title="Hardware Lifecycle"
            subtitle="Asset lifecycle status"
            total={assetOverview.total}
            percentage={assetOverview.lifecycleGoodPct}
            donutLabel={`${assetOverview.lifecycleGoodPct}%`}
            donutCaption="Good"
            onRowClick={(row) => setDrilldown({ title: "Hardware Lifecycle", subtitle: "Asset lifecycle status", row })}
            rows={[
              { label: "Good", value: assetOverview.lifecycleGood, color: "bg-indigo-400", assets: assetOverview.lifecycleRows.good },
              { label: "End of Renewal < 180 Days", value: assetOverview.lifecycleRenewal180, color: "bg-yellow-400", assets: assetOverview.lifecycleRows.renewal180 },
          
              { label: "No Coverage", value: assetOverview.noLifecycleDate, color: "bg-gray-400", assets: assetOverview.lifecycleRows.none },
            ]}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card p-5 flex flex-col items-center text-center">
            <div className={`w-10 h-10 rounded-xl ${card.light} flex items-center justify-center text-xl mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/assets" className="card hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <FiBox className="text-blue-600 text-2xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Manage Assets</h3>
              <p className="text-sm text-gray-500">Add, edit or view assets</p>
            </div>
          </div>
        </Link>
        {isAdmin && (
          <>
            <Link href="/dashboard/users" className="card hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <FiUsers className="text-purple-600 text-2xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-500">Manage system users</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/departments" className="card hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <FiBriefcase className="text-orange-600 text-2xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Departments</h3>
                  <p className="text-sm text-gray-500">Manage departments</p>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Recent Assets */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 text-lg">Recent Assets</h3>
          <Link href="/dashboard/assets" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all →
          </Link>
        </div>

        {recentAssets.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FiBox className="text-4xl mx-auto mb-2" />
            <p>No assets yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Asset Tag</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Category</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Department</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {recentAssets.map((asset) => (
                  <tr key={asset._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs text-gray-600">{asset.assetTag}</td>
                    <td className="py-3 px-2 font-medium text-gray-900">{asset.name}</td>
                    <td className="py-3 px-2 text-gray-600">{asset.category}</td>
                    <td className="py-3 px-2">
                      <span className={statusClass[asset.status] || "badge-staff"}>{asset.status}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{asset.department?.name || "—"}</td>
                    <td className="py-3 px-2 text-gray-400 text-xs">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewRing({
  label,
  value,
  sublabel,
  accent,
  tone,
}: {
  label: string;
  value: number;
  sublabel: string;
  accent: string;
  tone: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full ${tone} ring-8 ring-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]`}>
        <div className="text-center">
          <div className={`text-[10px] font-bold uppercase tracking-wider ${accent}`}>{label}</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900 leading-none">{value}</div>
          <div className="mt-1 text-[11px] text-gray-500">{sublabel}</div>
        </div>
      </div>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${className}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-gray-900 truncate">{value}</p>
        {detail && <p className="text-sm text-gray-500">{detail}</p>}
      </div>
    </div>
  );
}

function SmallCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ReportPanel({
  title,
  subtitle,
  total,
  percentage,
  donutLabel,
  donutCaption,
  rows,
  onRowClick,
}: {
  title: string;
  subtitle: string;
  total: number;
  percentage: number;
  donutLabel: string;
  donutCaption: string;
  rows: Array<BreakdownRow>;
  onRowClick: (row: BreakdownRow) => void;
}) {
  const fallbackProgress = Math.min(Math.max(percentage, 0), 100);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">{title}</p>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-[132px_1fr] gap-5 items-center">
        <div className="flex items-center justify-center">
          <div className="relative h-28 w-28 rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(#a5b4fc 0deg ${fallbackProgress * 3.6}deg, #e5e7eb ${fallbackProgress * 3.6}deg 360deg)`,
              }}
            />
            <div className="absolute inset-[10px] rounded-full bg-white flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-semibold text-gray-900 leading-none">{donutLabel}</div>
              <div className="mt-1 text-[11px] text-gray-500">{donutCaption}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">{subtitle}</p>
            <p className="text-xs text-gray-400">{total} assets</p>
          </div>
          <div className="space-y-3">
            {rows.map((row) => (
              <button
                key={row.label}
                type="button"
                disabled={row.value <= 0}
                onClick={() => row.value > 0 && onRowClick(row)}
                className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 text-left ${row.value > 0 ? "cursor-pointer group" : "cursor-default opacity-70"}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                <div className="border-b border-gray-200 pb-1 text-sm text-gray-700 group-hover:text-gray-900 group-hover:border-gray-300 transition-colors">
                  {row.label}
                </div>
                <div className="pb-1 text-sm text-gray-900 font-medium">{row.value}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-400" style={{ width: `${fallbackProgress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  values.forEach((value) => map.set(value, (map.get(value) ?? 0) + 1));
  return map;
}

function topEntry(map: Map<string, number>) {
  let topLabel = "—";
  let topCount = 0;
  for (const [label, count] of map.entries()) {
    if (count > topCount) {
      topLabel = label;
      topCount = count;
    }
  }
  return { label: topLabel, count: topCount };
}

function buildAssetOverview(items: DashboardAsset[]) {
  const assetItems = items.filter(isAssetRecord);
  const total = assetItems.length;
  const assigned = assetItems.filter((asset) => asset.assetState === "Assigned").length;
  const inStore = assetItems.filter((asset) => asset.assetState === "In Store").length;
  const underRepair = assetItems.filter((asset) => asset.assetState === "Under Repair").length;
  const disposed = assetItems.filter((asset) => asset.assetState === "Disposed").length;

  const supportBuckets = bucketDates(assetItems, (asset) => asset.warrantyExpiryDate, [90, 60, 30]);
  const lifecycleBuckets = countLifecycle(assetItems);

  const categories = countBy(assetItems.map((asset) => asset.product?.category?.name || "Uncategorized"));
  const sites = countBy(assetItems.map((asset) => asset.site?.name || "Unassigned"));
  const departments = countBy(assetItems.map((asset) => asset.department?.name || "Unassigned"));

  return {
    total,
    assigned,
    inStore,
    underRepair,
    disposed,
    supportGood: supportBuckets.good,
    support90: supportBuckets.buckets[90],
    support60: supportBuckets.buckets[60],
    support30: supportBuckets.buckets[30],
    expiredSupport: supportBuckets.expired,
    noSupportDate: supportBuckets.none,
    supportGoodPct: total ? Math.round((supportBuckets.good / total) * 100) : 0,
    supportRows: supportBuckets.rows,
    lifecycleGood: lifecycleBuckets.good,
    lifecycleRenewal180: lifecycleBuckets.renewal180,
    lifecycleRenewal: lifecycleBuckets.renewal,
    lifecycleSupport180: lifecycleBuckets.support180,
    lifecycleSupport: lifecycleBuckets.support,
    noLifecycleDate: lifecycleBuckets.none,
    lifecycleGoodPct: total ? Math.round((lifecycleBuckets.good / total) * 100) : 0,
    lifecycleRows: lifecycleBuckets.rows,
    topCategory: topEntry(categories),
    topSite: topEntry(sites),
    topDepartment: topEntry(departments),
  };
}

function isAssetRecord(asset: DashboardAsset) {
  return asset.product?.productType?.type === "Asset";
}

function bucketDates(items: DashboardAsset[], selector: (asset: DashboardAsset) => string | null | undefined, days: number[]) {
  const buckets = Object.fromEntries(days.map((day) => [day, 0])) as Record<number, number>;
  const rows = {
    good: [] as DashboardAsset[],
    days90: [] as DashboardAsset[],
    days60: [] as DashboardAsset[],
    days30: [] as DashboardAsset[],
    expired: [] as DashboardAsset[],
    none: [] as DashboardAsset[],
  };
  let expired = 0;
  let none = 0;
  let good = 0;

  const sorted = [...days].sort((a, b) => a - b);

  items.forEach((asset) => {
    const value = selector(asset);
    if (!value) {
      none += 1;
      rows.none.push(asset);
      return;
    }

    const target = new Date(value);
    if (Number.isNaN(target.getTime())) {
      none += 1;
      rows.none.push(asset);
      return;
    }

    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays < 0) {
      expired += 1;
      rows.expired.push(asset);
      return;
    }

    const matched = sorted.find((day) => diffDays <= day);
    if (matched) {
      buckets[matched] += 1;
      if (matched === 90) rows.days90.push(asset);
      if (matched === 60) rows.days60.push(asset);
      if (matched === 30) rows.days30.push(asset);
    } else {
      good += 1;
      rows.good.push(asset);
    }
  });

  return { buckets, expired, none, good, rows };
}

function countLifecycle(items: DashboardAsset[]) {
  let good = 0;
  let renewal180 = 0;
  let renewal = 0;
  let support180 = 0;
  let support = 0;
  let none = 0;
  const rows = {
    good: [] as DashboardAsset[],
    renewal180: [] as DashboardAsset[],
    renewal: [] as DashboardAsset[],
    support180: [] as DashboardAsset[],
    support: [] as DashboardAsset[],
    none: [] as DashboardAsset[],
  };

  items.forEach((asset) => {
    const warrantyDate = asset.warrantyExpiryDate ? new Date(asset.warrantyExpiryDate) : null;
    const hasValidWarrantyDate = Boolean(warrantyDate && !Number.isNaN(warrantyDate.getTime()));

    // No Coverage in Hardware Lifecycle means warranty date is not set/null/invalid.
    if (!hasValidWarrantyDate) {
      none += 1;
      rows.none.push(asset);
      return;
    }

    if (!asset.assetState) {
      renewal += 1;
      rows.renewal.push(asset);
      return;
    }

    if (asset.assetState === "In Store" || asset.assetState === "Assigned") {
      good += 1;
      rows.good.push(asset);
      return;
    }

    if (asset.assetState === "Under Repair") {
      renewal180 += 1;
      rows.renewal180.push(asset);
      return;
    }

    if (asset.assetState === "Retired") {
      support180 += 1;
      rows.support180.push(asset);
      return;
    }

    if (asset.assetState === "Disposed") {
      support += 1;
      rows.support.push(asset);
      return;
    }

    renewal += 1;
    rows.renewal.push(asset);
  });

  return { good, renewal180, renewal, support180, support, none, rows };
}
