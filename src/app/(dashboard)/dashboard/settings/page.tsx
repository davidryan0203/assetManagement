"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import { FiSave, FiUsers, FiSettings, FiMail } from "react-icons/fi";

type Role = "admin" | "manager" | "staff";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingRecipients, setSavingRecipients] = useState(false);
  const [recipientsInput, setRecipientsInput] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.get("/settings/disposal-recipients"),
      api.get("/users"),
    ])
      .then(([settingsRes, usersRes]) => {
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
    </div>
  );
}
