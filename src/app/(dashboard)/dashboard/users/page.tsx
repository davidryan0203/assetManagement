"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import toast from "react-hot-toast";
import Modal from "@frontend/components/ui/Modal";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUsers } from "react-icons/fi";
import { useRouter } from "next/navigation";
import SearchableSelect from "@frontend/components/ui/SearchableSelect";

interface User {
  _id: string;
  name: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  employeeId?: string;
  email: string;
  role: "admin" | "manager" | "staff";
  phone?: string;
  mobile?: string;
  isActive: boolean;
  department?: { _id: string; name: string; code: string } | null;
  site?: { _id: string; name: string } | null;
  createdAt: string;
}

interface Department { _id: string; name: string; code: string; }
interface Site { _id: string; name: string; }

const roleBadge: Record<string, string> = {
  admin: "badge-admin",
  manager: "badge-manager",
  staff: "badge-staff",
};

const emptyForm = {
  firstName: "", lastName: "", displayName: "", employeeId: "", description: "",
  email: "", password: "", phone: "", mobile: "",
  role: "staff", department: "", site: "", isActive: true,
};

const SECTION_HEADER = ({ title }: { title: string }) => (
  <div className="col-span-2 border-b border-gray-100 pb-1 mt-2">
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h4>
  </div>
);

export default function UsersPage() {
  const { user: me, isAdmin } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) { router.replace("/dashboard"); }
  }, [isAdmin, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data.users);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data.departments));
    api.get("/sites").then((r) => setSites(r.data.sites));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.employeeId || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditUser(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      displayName: user.displayName || "",
      employeeId: user.employeeId || "",
      description: "",
      email: user.email,
      password: "",
      phone: user.phone || "",
      mobile: user.mobile || "",
      role: user.role,
      department: user.department?._id || "",
      site: user.site?._id || "",
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const f = (key: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error("First name, last name and email are required");
      return;
    }
    if (!editUser && !form.password) {
      toast.error("Password is required for new users");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        department: form.department || null,
        site: form.site || null,
        password: form.password || undefined,
      };
      if (editUser) {
        await api.put(`/users/${editUser._id}`, payload);
        toast.success("User updated");
      } else {
        await api.post("/users", payload);
        toast.success("User created");
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to save user");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteId}`);
      toast.success("User deleted");
      setDeleteId(null);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to delete user");
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">{filtered.length} users</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add User
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiUsers className="text-5xl mx-auto mb-3" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Role</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Department</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Site</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Joined</th>
                  {isAdmin && <th className="text-right py-3.5 px-4 text-gray-500 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 text-xs font-bold">
                            {(u.firstName || u.name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          {u.employeeId && <p className="text-xs text-gray-400">{u.employeeId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={roleBadge[u.role] || "badge-staff"}>{u.role}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{u.department?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{u.site?.name || "—"}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <FiEdit2 />
                          </button>
                          {me?.id !== u._id && (
                            <button onClick={() => setDeleteId(u._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editUser ? "Edit User" : "Add New User"}
        size="xl"
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">

          {/* Personal Details */}
          <SECTION_HEADER title="Personal Details" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input className="input-field" value={form.firstName} onChange={f("firstName")} placeholder="John" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input className="input-field" value={form.lastName} onChange={f("lastName")} placeholder="Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input className="input-field" value={form.displayName} onChange={f("displayName")} placeholder="Johnny D" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
            <input className="input-field" value={form.employeeId} onChange={f("employeeId")} placeholder="EMP-0001" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={f("description")} placeholder="Brief description..." />
          </div>

          {/* Contact Information */}
          <SECTION_HEADER title="Contact Information" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" className="input-field" value={form.email} onChange={f("email")} placeholder="john@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {editUser ? "(leave blank to keep)" : "*"}
            </label>
            <input type="password" className="input-field" value={form.password} onChange={f("password")} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input className="input-field" value={form.phone} onChange={f("phone")} placeholder="+1 555 000 0000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
            <input className="input-field" value={form.mobile} onChange={f("mobile")} placeholder="+1 555 000 0001" />
          </div>

          {/* Department Details */}
          <SECTION_HEADER title="Department Details" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <SearchableSelect
              allowNone={false}
              options={[
                { value: "staff", label: "Staff" },
                { value: "manager", label: "Manager" },
                { value: "admin", label: "Admin" },
              ]}
              value={form.role}
              onChange={(v) => setForm((p) => ({ ...p, role: v }))}
              placeholder="Select role"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <SearchableSelect
              options={sites.map((s) => ({ value: s._id, label: s.name }))}
              value={form.site}
              onChange={(v) => setForm((p) => ({ ...p, site: v }))}
              placeholder="Select site"
              noneLabel="— No Site —"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <SearchableSelect
              options={departments.map((d) => ({ value: d._id, label: d.name }))}
              value={form.department}
              onChange={(v) => setForm((p) => ({ ...p, department: v }))}
              placeholder="Select department"
              noneLabel="— No Department —"
            />
          </div>
          {editUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="input-field" value={form.isActive ? "true" : "false"} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "true" }))}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving..." : editUser ? "Update User" : "Create User"}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
