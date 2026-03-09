"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import toast from "react-hot-toast";
import Modal from "@frontend/components/ui/Modal";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiTruck } from "react-icons/fi";
import { useRouter } from "next/navigation";

interface Vendor {
  _id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { name: "", contactName: "", email: "", phone: "", website: "", address: "", notes: "", isActive: true };

// Format input as Canadian phone: 1-XXX-XXX-XXXX
function formatCanadianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 1) return digits;
  if (digits.length <= 4) return `1-${digits.slice(1)}`;
  if (digits.length <= 7) return `1-${digits.slice(1, 4)}-${digits.slice(4)}`;
  if (digits.length <= 11) return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

export default function VendorsPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) { router.replace("/dashboard"); }
  }, [isAdmin, router]);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/vendors");
      setVendors(res.data.vendors);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditVendor(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (v: Vendor) => {
    setEditVendor(v);
    setForm({
      name: v.name,
      contactName: v.contactName || "",
      email: v.email || "",
      phone: v.phone || "",
      website: v.website || "",
      address: v.address || "",
      notes: v.notes || "",
      isActive: v.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Vendor name is required"); return; }
    setSaving(true);
    try {
      if (editVendor) {
        await api.put(`/vendors/${editVendor._id}`, form);
        toast.success("Vendor updated");
      } else {
        await api.post("/vendors", form);
        toast.success("Vendor created");
      }
      setShowModal(false);
      fetchVendors();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to save vendor");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/vendors/${deleteId}`);
      toast.success("Vendor deleted");
      setDeleteId(null);
      fetchVendors();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to delete vendor");
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Vendors</h2>
          <p className="text-sm text-gray-500">{filtered.length} vendors</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Vendor
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiTruck className="text-5xl mx-auto mb-3" />
            <p className="font-medium">No vendors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Contact</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Phone</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Website</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Status</th>
                  {isAdmin && <th className="text-right py-3.5 px-4 text-gray-500 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-900">{v.name}</td>
                    <td className="py-3.5 px-4 text-gray-600">{v.contactName || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{v.email || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{v.phone || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {v.website ? (
                        <a href={v.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline truncate max-w-[140px] block">
                          {v.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <FiEdit2 />
                          </button>
                          <button onClick={() => setDeleteId(v._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <FiTrash2 />
                          </button>
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editVendor ? "Edit Vendor" : "Add Vendor"}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Apple" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
            <input className="input-field" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="John Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vendor@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatCanadianPhone(e.target.value) })}
              placeholder="1-709-888-8888"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input className="input-field" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://apple.com" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, State" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
          </div>
          {editVendor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="input-field" value={form.isActive ? "true" : "false"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving..." : editVendor ? "Update" : "Create"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor?"
        loading={deleting}
      />
    </div>
  );
}
