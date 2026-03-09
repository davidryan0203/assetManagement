"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import toast from "react-hot-toast";
import Modal from "@frontend/components/ui/Modal";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import SearchableSelect from "@frontend/components/ui/SearchableSelect";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiTag } from "react-icons/fi";
import { useRouter } from "next/navigation";

interface Category { _id: string; name: string; }
interface ProductType {
  _id: string;
  name: string;
  category: Category;
  type: "Asset" | "Consumable";
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { name: "", category: "", type: "Asset" as "Asset" | "Consumable", isActive: true };

const typeClass: Record<string, string> = {
  Asset: "bg-blue-100 text-blue-700",
  Consumable: "bg-orange-100 text-orange-700",
};

export default function ProductTypesPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ProductType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) { router.replace("/dashboard"); }
  }, [isAdmin, router]);

  const fetchProductTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/product-types");
      setProductTypes(res.data.productTypes);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProductTypes(); }, [fetchProductTypes]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.categories));
  }, []);

  const filtered = productTypes.filter((pt) =>
    pt.name.toLowerCase().includes(search.toLowerCase()) ||
    (pt.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (pt: ProductType) => {
    setEditItem(pt);
    setForm({
      name: pt.name,
      category: pt.category?._id || "",
      type: pt.type,
      isActive: pt.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error("Name and category are required");
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/product-types/${editItem._id}`, form);
        toast.success("Product type updated");
      } else {
        await api.post("/product-types", form);
        toast.success("Product type created");
      }
      setShowModal(false);
      fetchProductTypes();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to save product type");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/product-types/${deleteId}`);
      toast.success("Product type deleted");
      setDeleteId(null);
      fetchProductTypes();
    } catch {
      toast.error("Failed to delete product type");
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Product Types</h2>
          <p className="text-sm text-gray-500">{filtered.length} product types</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Product Type
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by name or category..."
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
            <FiTag className="text-5xl mx-auto mb-3" />
            <p className="font-medium">No product types found</p>
            {isAdmin && <p className="text-sm mt-1">Click &quot;Add Product Type&quot; to get started</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Product Type</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Category</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Type</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Status</th>
                  {isAdmin && <th className="text-right py-3.5 px-4 text-gray-500 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((pt) => (
                  <tr key={pt._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-900">{pt.name}</td>
                    <td className="py-3.5 px-4 text-gray-600">{pt.category?.name || "—"}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeClass[pt.type] || "bg-gray-100 text-gray-500"}`}>
                        {pt.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pt.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {pt.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(pt)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <FiEdit2 />
                          </button>
                          <button onClick={() => setDeleteId(pt._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
        title={editItem ? "Edit Product Type" : "Add Product Type"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Type Name *</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Chromebook, Laptop, Mobile Phone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <SearchableSelect
              allowNone={false}
              options={categories.map((c) => ({ value: c._id, label: c.name }))}
              value={form.category}
              onChange={(v) => setForm((p) => ({ ...p, category: v }))}
              placeholder="Select category"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "Asset" | "Consumable" })}
            >
              <option value="Asset">Asset</option>
              <option value="Consumable">Consumable</option>
            </select>
          </div>
          {editItem && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="input-field"
                value={form.isActive ? "true" : "false"}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving..." : editItem ? "Update" : "Create"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product Type"
        message="Are you sure you want to delete this product type? Products using it may be affected."
        loading={deleting}
      />
    </div>
  );
}
