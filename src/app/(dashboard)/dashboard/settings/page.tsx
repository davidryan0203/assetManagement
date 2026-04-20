"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import { FiSave, FiUsers, FiSettings, FiMail, FiUploadCloud, FiMapPin, FiRotateCcw } from "react-icons/fi";

type Role = "admin" | "manager" | "staff";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

type SiteItem = {
  id: string;
  _id: string;
  name: string;
};

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingRecipients, setSavingRecipients] = useState(false);
  const [recipientsInput, setRecipientsInput] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [rollbackFile, setRollbackFile] = useState<File | null>(null);
  const [rollingBackDatabase, setRollingBackDatabase] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.get("/settings/disposal-recipients"),
      api.get("/users"),
      api.get("/sites"),
    ])
      .then(([settingsRes, usersRes, sitesRes]) => {
        const recipients: string[] = settingsRes.data?.recipients || [];
        setRecipientsInput(recipients.join(", "));

        const fetchedUsers: UserItem[] = (usersRes.data?.users || []).map((user: UserItem) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        }));
        setUsers(fetchedUsers);

        const fetchedSites: SiteItem[] = sitesRes.data?.sites || [];
        setSites(fetchedSites);
      })
      .catch((error: unknown) => {
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(message || "Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const parsedRecipients = useMemo(
    () => recipientsInput.split(/[;,\s]+/).map((value) => value.trim()).filter(Boolean),
    [recipientsInput],
  );

  const saveRecipients = async () => {
    setSavingRecipients(true);
    try {
      await api.put("/settings/disposal-recipients", { recipients: parsedRecipients });
      toast.success("Disposal recipients updated");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to save recipients");
    } finally {
      setSavingRecipients(false);
    }
  };

  const updateUser = async (userId: string, changes: Partial<UserItem>) => {
    const target = users.find((user) => user.id === userId);
    if (!target) return;

    setSavingUserId(userId);
    try {
      await api.put(`/users/${userId}`, {
        role: changes.role ?? target.role,
        isActive: changes.isActive ?? target.isActive,
      });

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, ...changes } : user)));
      toast.success("User updated");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to update user");
    } finally {
      setSavingUserId(null);
    }
  };

  const uploadAssets = async () => {
    if (!selectedSiteId) {
      toast.error("Please select a site");
      return;
    }

    if (!uploadFile) {
      toast.error("Please choose a CSV or XLSX file");
      return;
    }

    const lowerName = uploadFile.name.toLowerCase();
    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
      toast.error("Unsupported file type. Use CSV or XLSX.");
      return;
    }

    setUploadingAssets(true);
    try {
      const formData = new FormData();
      formData.append("siteId", selectedSiteId);
      formData.append("file", uploadFile);

      const response = await api.post("/assets/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`Imported ${response.data?.importedCount || 0} assets successfully`);
      setUploadFile(null);
    } catch (error: unknown) {
      const errorData = (error as { response?: { data?: { message?: string; existingAssets?: Array<{ assetTag: string }>; duplicateAssetTags?: string[]; errors?: string[]; errorCount?: number } } })
        ?.response?.data;

      if (errorData?.duplicateAssetTags?.length) {
        toast.error(`Duplicate asset tags in file: ${errorData.duplicateAssetTags.slice(0, 5).join(", ")}`);
        return;
      }

      if (errorData?.existingAssets?.length) {
        const tags = errorData.existingAssets.slice(0, 5).map((item) => item.assetTag).join(", ");
        toast.error(`Upload halted. Existing asset tags found: ${tags}`);
        return;
      }

      if (errorData?.errors?.length) {
        const head = errorData.errors.slice(0, 2).join(" | ");
        const more = errorData.errorCount && errorData.errorCount > 2 ? ` (+${errorData.errorCount - 2} more)` : "";
        toast.error(`${head}${more}`);
        return;
      }

      toast.error(errorData?.message || "Failed to import assets");
    } finally {
      setUploadingAssets(false);
    }
  };

  const rollbackDatabase = async () => {
    if (!rollbackFile) {
      toast.error("Please choose a SQL dump file");
      return;
    }

    if (!rollbackFile.name.toLowerCase().endsWith(".sql")) {
      toast.error("Unsupported file type. Use a .sql file.");
      return;
    }

    const confirmed = window.confirm(
      "This will rollback database records from the uploaded SQL file and keep users untouched. Continue?",
    );
    if (!confirmed) return;

    setRollingBackDatabase(true);
    try {
      const formData = new FormData();
      formData.append("file", rollbackFile);

      const response = await api.post("/settings/db-rollback", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const restored = response.data?.restoredTables as Record<string, number> | undefined;
      const restoredCount = restored ? Object.values(restored).reduce((sum, count) => sum + count, 0) : 0;
      toast.success(`Rollback complete. Restored ${restoredCount} SQL statement(s).`);
      setRollbackFile(null);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to rollback database");
    } finally {
      setRollingBackDatabase(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="mt-2 text-sm text-gray-500">Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Administration</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Settings</h1>
      </div>

      <div className="card rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <FiMail />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Disposal Approval Recipients</h2>
              <p className="text-sm text-gray-500 mt-1">
                Emails here will receive approval requests when an asset is marked for disposal.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Recipient Emails</label>
          <textarea
            value={recipientsInput}
            onChange={(e) => setRecipientsInput(e.target.value)}
            rows={3}
            className="input-field w-full"
            placeholder="admin@company.com, ops@company.com"
          />
          <p className="text-xs text-gray-500">Use comma, space, or semicolon separators.</p>
          <button
            type="button"
            onClick={saveRecipients}
            disabled={savingRecipients}
            className="btn-primary inline-flex items-center gap-2"
          >
            <FiSave />
            {savingRecipients ? "Saving..." : "Save Recipients"}
          </button>
        </div>
      </div>

      <div className="card rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <FiUsers />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
              <p className="text-sm text-gray-500 mt-1">Quickly manage roles and active status from Settings.</p>
            </div>
          </div>
          <Link href="/dashboard/users" className="btn-secondary inline-flex items-center gap-2">
            <FiSettings />
            Open Full User Management
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const busy = savingUserId === user.id;
                return (
                  <tr key={user.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => updateUser(user.id, { role: e.target.value as Role })}
                        disabled={busy}
                        className="input-field min-w-[8rem]"
                      >
                        <option value="admin">admin</option>
                        <option value="manager">manager</option>
                        <option value="staff">staff</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-gray-700">
                        <input
                          type="checkbox"
                          checked={user.isActive}
                          onChange={(e) => updateUser(user.id, { isActive: e.target.checked })}
                          disabled={busy}
                        />
                        <span>{user.isActive ? "Yes" : "No"}</span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{busy ? "Saving..." : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-sky-50 p-2 text-sky-600">
            <FiUploadCloud />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Asset Upload</h2>
            <p className="text-sm text-gray-500 mt-1">
              Import the migration sheet ("For migration" tab export) and assign all rows to the selected site.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Expected columns: Asset ID, Asset Tag (optional), Product Type, Product, Serial, Location.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Site</label>
            <div className="relative">
              <FiMapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="input-field w-full pl-9"
              >
                <option value="">Select a site</option>
                {sites.map((site) => (
                  <option key={site._id || site.id} value={site._id || site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Upload File</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="input-field w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              {uploadFile ? `Selected: ${uploadFile.name}` : "Choose a CSV or XLSX file"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={uploadAssets}
            disabled={uploadingAssets}
            className="btn-primary inline-flex items-center gap-2"
          >
            <FiUploadCloud />
            {uploadingAssets ? "Uploading..." : "Upload And Import"}
          </button>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-rose-50 p-2 text-rose-600">
              <FiRotateCcw />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Database Rollback Upload (Keeps Users)</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload a MySQL dump (`.sql`) to rollback records while preserving current users.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SQL Rollback File</label>
              <input
                type="file"
                accept=".sql"
                onChange={(e) => setRollbackFile(e.target.files?.[0] || null)}
                className="input-field w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                {rollbackFile ? `Selected: ${rollbackFile.name}` : "Choose a .sql file"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={rollbackDatabase}
              disabled={rollingBackDatabase}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRotateCcw />
              {rollingBackDatabase ? "Rolling Back..." : "Run Rollback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
