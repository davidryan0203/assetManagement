"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import toast from "react-hot-toast";
import Modal from "@frontend/components/ui/Modal";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import SearchableSelect from "@frontend/components/ui/SearchableSelect";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiCpu } from "react-icons/fi";
import { useRouter } from "next/navigation";

interface Category { _id: string; name: string; }
interface Vendor { _id: string; name: string; }
interface Product {
  _id: string;
  name: string;
  sku?: string;
  category: Category;
  vendor?: Vendor | null;
  description?: string;
  modelNumber?: string;
  manufacturer?: string;
  defaultWarrantyMonths?: number;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  name: "", sku: "", category: "", vendor: "",
  description: "", modelNumber: "", manufacturer: "",
  defaultWarrantyMonths: "", isActive: true,
};

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) { router.replace("/dashboard"); }
  }, [isAdmin, router]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterCategory) params.category = filterCategory;
      const res = await api.get("/products", { params });
      setProducts(res.data.products);
    } finally { setLoading(false); }
  }, [filterCategory]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data.categories));
    api.get("/vendors").then((r) => setVendors(r.data.vendors));
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.modelNumber || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditProduct(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      category: p.category?._id || "",
      vendor: p.vendor?._id || "",
      description: p.description || "",
      modelNumber: p.modelNumber || "",
      manufacturer: p.manufacturer || "",
      defaultWarrantyMonths: p.defaultWarrantyMonths?.toString() || "",
      isActive: p.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category) {
      toast.error("Product name and category are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        vendor: form.vendor || null,
        defaultWarrantyMonths: form.defaultWarrantyMonths ? Number(form.defaultWarrantyMonths) : null,
      };
      if (editProduct) {
        await api.put(`/products/${editProduct._id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product created");
      }
      setShowModal(false);
      fetchProducts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to save product");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteId}`);
      toast.success("Product deleted");
      setDeleteId(null);
      fetchProducts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to delete product");
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500">{filtered.length} products</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Product
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search by name, SKU, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field sm:w-48"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiCpu className="text-5xl mx-auto mb-3" />
            <p className="font-medium">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">SKU</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Category</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Vendor</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Model #</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Warranty</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Status</th>
                  {isAdmin && <th className="text-right py-3.5 px-4 text-gray-500 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{p.category?.name}</td>
                    <td className="py-3.5 px-4 text-gray-600">{p.vendor?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{p.modelNumber || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {p.defaultWarrantyMonths ? `${p.defaultWarrantyMonths} mo` : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <FiEdit2 />
                          </button>
                          <button onClick={() => setDeleteId(p._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
        title={editProduct ? "Edit Product" : "Add Product"}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. MacBook Pro M3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input className="input-field" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. MBP-M3-14" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
            <input className="input-field" value={form.modelNumber} onChange={(e) => setForm({ ...form, modelNumber: e.target.value })} placeholder="e.g. A2992" />
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <SearchableSelect
              options={vendors.map((v) => ({ value: v._id, label: v.name }))}
              value={form.vendor}
              onChange={(v) => setForm((p) => ({ ...p, vendor: v }))}
              placeholder="Select vendor"
              noneLabel="— No Vendor —"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input className="input-field" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Apple" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Warranty (months)</label>
            <input type="number" min="0" className="input-field" value={form.defaultWarrantyMonths} onChange={(e) => setForm({ ...form, defaultWarrantyMonths: e.target.value })} placeholder="e.g. 12" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
          </div>
          {editProduct && (
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
            {saving ? "Saving..." : editProduct ? "Update" : "Create"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? Assets linked to it may be affected."
        loading={deleting}
      />
    </div>
  );
}
