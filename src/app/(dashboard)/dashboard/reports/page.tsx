"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import toast from "react-hot-toast";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import Modal from "@frontend/components/ui/Modal";
import {
  FiPlus, FiFolder, FiFolderPlus, FiTrash2, FiEdit2, FiBarChart2,
  FiChevronDown, FiChevronRight, FiMoreVertical, FiPlay,
} from "react-icons/fi";

interface Folder {
  _id: string;
  name: string;
  createdBy: { name: string };
  createdAt: string;
}

interface Report {
  _id: string;
  title: string;
  reportType: string;
  module: string;
  subModule: string;
  folder?: Folder | null;
  createdBy: { name: string };
  createdAt: string;
}

interface FolderGroup {
  folder: Folder | null;
  reports: Report[];
}

export default function ReportsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["__none__"]));

  // New Folder modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  // Rename folder
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [renameName, setRenameName] = useState("");

  // Delete
  const [deleteReport, setDeleteReport] = useState<string | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Open menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, fRes] = await Promise.all([
        api.get("/reports"),
        api.get("/report-folders"),
      ]);
      setReports(rRes.data.reports);
      setFolders(fRes.data.folders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group reports by folder
  const grouped: FolderGroup[] = [];

  // Unfoldered
  const unfoldered = reports.filter((r) => !r.folder);
  if (unfoldered.length > 0) {
    grouped.push({ folder: null, reports: unfoldered });
  }

  // Each folder
  for (const folder of folders) {
    const folderReports = reports.filter((r) => r.folder?._id === folder._id);
    grouped.push({ folder, reports: folderReports });
  }

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setSavingFolder(true);
    try {
      await api.post("/report-folders", { name: folderName.trim() });
      toast.success("Folder created");
      setShowFolderModal(false);
      setFolderName("");
      fetchData();
    } catch {
      toast.error("Failed to create folder");
    } finally { setSavingFolder(false); }
  };

  const handleRenameFolder = async () => {
    if (!renameFolder || !renameName.trim()) return;
    setSavingFolder(true);
    try {
      await api.patch(`/report-folders/${renameFolder._id}`, { name: renameName.trim() });
      toast.success("Folder renamed");
      setRenameFolder(null);
      fetchData();
    } catch {
      toast.error("Failed to rename");
    } finally { setSavingFolder(false); }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolder) return;
    setDeleting(true);
    try {
      await api.delete(`/report-folders/${deleteFolder}`);
      toast.success("Folder deleted");
      setDeleteFolder(null);
      fetchData();
    } catch {
      toast.error("Failed to delete folder");
    } finally { setDeleting(false); }
  };

  const handleDeleteReport = async () => {
    if (!deleteReport) return;
    setDeleting(true);
    try {
      await api.delete(`/reports/${deleteReport}`);
      toast.success("Report deleted");
      setDeleteReport(null);
      fetchData();
    } catch {
      toast.error("Failed to delete report");
    } finally { setDeleting(false); }
  };

  const reportTypeColor: Record<string, string> = {
    Tabular: "bg-blue-100 text-blue-700",
    Matrix: "bg-purple-100 text-purple-700",
    Summary: "bg-green-100 text-green-700",
    Scan: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6" onClick={() => setOpenMenuId(null)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">All Reports</h2>
          <p className="text-sm text-gray-500">{reports.length} report{reports.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowFolderModal(true); }}
              className="btn-secondary flex items-center gap-2">
              <FiFolderPlus className="w-4 h-4" /> New Folder
            </button>
            <button
              onClick={() => router.push("/dashboard/reports/new")}
              className="btn-primary flex items-center gap-2">
              <FiPlus className="w-4 h-4" /> New Custom Report
            </button>
          </div>
        )}
      </div>

      {/* Report List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FiBarChart2 className="text-5xl mx-auto mb-3" />
          <p className="font-medium">No reports yet</p>
          {isAdmin && (
            <p className="text-sm mt-1">
              Click &quot;New Custom Report&quot; to create your first report
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const key = group.folder?._id ?? "__none__";
            const isExpanded = expandedFolders.has(key);
            return (
              <div key={key} className="card overflow-hidden">
                {/* Folder header */}
                <div
                  className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFolder(key)}>
                  {isExpanded ? <FiChevronDown className="text-gray-400" /> : <FiChevronRight className="text-gray-400" />}
                  <FiFolder className={`${group.folder ? "text-amber-500" : "text-gray-400"} text-lg`} />
                  <span className="font-medium text-gray-800 flex-1">
                    {group.folder?.name ?? "Uncategorized"}
                  </span>
                  <span className="text-xs text-gray-400 mr-2">
                    {group.reports.length} report{group.reports.length !== 1 ? "s" : ""}
                  </span>
                  {group.folder && isAdmin && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setRenameFolder(group.folder!); setRenameName(group.folder!.name); }}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteFolder(group.folder!._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Reports inside folder */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {group.reports.length === 0 ? (
                      <div className="px-12 py-4 text-sm text-gray-400 italic">No reports in this folder</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-2.5 px-5 text-gray-500 font-medium text-xs uppercase tracking-wide">Report Name</th>
                            <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Owner</th>
                            <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Reports</th>
                            <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Type</th>
                            <th className="text-right py-2.5 px-5 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {group.reports.map((report) => (
                            <tr key={report._id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-2">
                                  <FiBarChart2 className="text-blue-400 shrink-0" />
                                  <span
                                    className="font-medium text-gray-800 hover:text-primary-600 cursor-pointer"
                                    onClick={() => router.push(`/dashboard/reports/wizard?id=${report._id}`)}>
                                    {report.title}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-600">{report.createdBy?.name}</td>
                              <td className="py-3 px-4 text-gray-500">
                                {report.module} / {report.subModule}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${reportTypeColor[report.reportType] ?? "bg-gray-100 text-gray-600"}`}>
                                  {report.reportType} Report
                                </span>
                              </td>
                              <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => router.push(`/dashboard/reports/preview?id=${report._id}`)}
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Run Report">
                                    <FiPlay className="w-3.5 h-3.5" />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={() => router.push(`/dashboard/reports/wizard?id=${report._id}`)}
                                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                      title="Edit Report">
                                      <FiEdit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => setDeleteReport(report._id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete">
                                      <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Folder Modal */}
      <Modal isOpen={showFolderModal} onClose={() => { setShowFolderModal(false); setFolderName(""); }} title="New Folder">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
            <input
              className="input-field"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Executive Dashboard"
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowFolderModal(false); setFolderName(""); }} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreateFolder} disabled={savingFolder} className="btn-primary flex-1">
              {savingFolder ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal isOpen={!!renameFolder} onClose={() => setRenameFolder(null)} title="Rename Folder">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
            <input
              className="input-field"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRenameFolder(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleRenameFolder} disabled={savingFolder} className="btn-primary flex-1">
              {savingFolder ? "Saving..." : "Rename"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Report Confirm */}
      <ConfirmDialog
        isOpen={!!deleteReport}
        onClose={() => setDeleteReport(null)}
        onConfirm={handleDeleteReport}
        title="Delete Report"
        message="Are you sure you want to delete this report? This action cannot be undone."
        loading={deleting}
      />

      {/* Delete Folder Confirm */}
      <ConfirmDialog
        isOpen={!!deleteFolder}
        onClose={() => setDeleteFolder(null)}
        onConfirm={handleDeleteFolder}
        title="Delete Folder"
        message="Are you sure you want to delete this folder? Reports inside will remain but become uncategorized."
        loading={deleting}
      />
    </div>
  );
}
