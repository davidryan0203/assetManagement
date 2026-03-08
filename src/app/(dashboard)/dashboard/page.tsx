"use client";

import { useEffect, useState } from "react";
import api from "@backend/lib/api";
import { FiBox, FiCheckCircle, FiTool, FiXCircle, FiUsers, FiBriefcase, FiClock } from "react-icons/fi";
import Link from "next/link";

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

const statusClass: Record<string, string> = {
  available: "status-available",
  "in-use": "status-in-use",
  maintenance: "status-maintenance",
  retired: "status-retired",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard").then((res) => {
      setStats(res.data.stats);
      setRecentAssets(res.data.recentAssets);
    }).finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6">
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
