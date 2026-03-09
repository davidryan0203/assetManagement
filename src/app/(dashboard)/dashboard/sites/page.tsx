"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import toast from "react-hot-toast";
import Modal from "@frontend/components/ui/Modal";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiMapPin } from "react-icons/fi";
import { useRouter } from "next/navigation";

interface Site {
  _id: string;
  name: string;
  description?: string;
  region?: string;
  doorNumber?: string;
  street?: string;
  landmark?: string;
  city?: string;
  stateProvince?: string;
  zipPostalCode?: string;
  country?: string;
  email?: string;
  phoneNo?: string;
  faxNo?: string;
  webUrl?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm: Omit<Site, "_id" | "createdAt"> = {
  name: "", description: "", region: "",
  doorNumber: "", street: "", landmark: "", city: "", stateProvince: "",
  zipPostalCode: "", country: "Canada",
  email: "", phoneNo: "", faxNo: "", webUrl: "",
  isActive: true,
};

const SECTION = ({ title }: { title: string }) => (
  <div className="col-span-2 border-b border-gray-100 pb-1 mt-2">
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h4>
  </div>
);

export default function SitesPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/sites");
      setSites(res.data.sites);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const filtered = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.country || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditSite(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (site: Site) => {
    setEditSite(site);
    setForm({
      name: site.name,
      description: site.description || "",
      region: site.region || "",
      doorNumber: site.doorNumber || "",
      street: site.street || "",
      landmark: site.landmark || "",
      city: site.city || "",
      stateProvince: site.stateProvince || "",
      zipPostalCode: site.zipPostalCode || "",
      country: site.country || "Canada",
      email: site.email || "",
      phoneNo: site.phoneNo || "",
      faxNo: site.faxNo || "",
      webUrl: site.webUrl || "",
      isActive: site.isActive,
    });
    setShowModal(true);
  };

  const f = (key: keyof typeof emptyForm) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  );

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Site name is required");
      return;
    }
    setSaving(true);
    try {
      if (editSite) {
        await api.put(`/sites/${editSite._id}`, form);
        toast.success("Site updated");
      } else {
        await api.post("/sites", form);
        toast.success("Site created");
      }
      setShowModal(false);
      fetchSites();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to save site");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/sites/${deleteId}`);
      toast.success("Site deleted");
      setDeleteId(null);
      fetchSites();
    } catch {
      toast.error("Failed to delete site");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sites</h2>
          <p className="text-sm text-gray-500">{filtered.length} sites</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Site
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
            placeholder="Search by name, city, country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 card">
          <FiMapPin className="text-5xl mx-auto mb-3" />
          <p className="font-medium">No sites found</p>
          {isAdmin && <p className="text-sm mt-1">Click &quot;Add Site&quot; to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((site) => (
            <div key={site._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                  <FiMapPin className="text-teal-600 text-lg" />
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(site)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <FiEdit2 className="text-sm" />
                    </button>
                    <button onClick={() => setDeleteId(site._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{site.name}</h3>
              {site.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{site.description}</p>
              )}
              <div className="space-y-1 text-xs text-gray-500 mt-2">
                {(site.city || site.country) && (
                  <p>📍 {[site.city, site.stateProvince, site.country].filter(Boolean).join(", ")}</p>
                )}
                {site.region && <p>🌐 {site.region}</p>}
                {site.phoneNo && <p>📞 {site.phoneNo}</p>}
                {site.email && <p>✉️ {site.email}</p>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${site.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {site.isActive ? "Active" : "Inactive"}
                </span>
                <span className="text-xs text-gray-400">{new Date(site.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editSite ? "Edit Site" : "Add New Site"} size="xl">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">

          {/* Site Details */}
          <SECTION title="Site Details" />
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input className="input-field" value={form.name} onChange={f("name")} placeholder="e.g. Labrador Regional Office" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <input className="input-field" value={form.region} onChange={f("region")} placeholder="Select Region" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={f("description")} placeholder="Site description" />
          </div>

          {/* Address */}
          <SECTION title="Address" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Door Number</label>
            <input className="input-field" value={form.doorNumber} onChange={f("doorNumber")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
            <input className="input-field" value={form.street} onChange={f("street")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
            <input className="input-field" value={form.landmark} onChange={f("landmark")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input className="input-field" value={form.city} onChange={f("city")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
            <input className="input-field" value={form.stateProvince} onChange={f("stateProvince")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP / Postal Code</label>
            <input className="input-field" value={form.zipPostalCode} onChange={f("zipPostalCode")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" value="Canada" readOnly />
          </div>

          {/* Contact Information */}
          <SECTION title="Contact Information" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input-field" value={form.email} onChange={f("email")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone No.</label>
            <input className="input-field" value={form.phoneNo} onChange={f("phoneNo")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fax No.</label>
            <input className="input-field" value={form.faxNo} onChange={f("faxNo")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Web URL</label>
            <input className="input-field" value={form.webUrl} onChange={f("webUrl")} placeholder="https://" />
          </div>

          {/* Status (edit only) */}
          {editSite && (
            <>
              <SECTION title="Status" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="input-field" value={form.isActive ? "true" : "false"} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "true" }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving..." : editSite ? "Update Site" : "Create Site"}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Site"
        message="Are you sure you want to delete this site? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
