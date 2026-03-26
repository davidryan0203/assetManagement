"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import toast from "react-hot-toast";
import Modal from "@frontend/components/ui/Modal";
import ConfirmDialog from "@frontend/components/ui/ConfirmDialog";
import SearchableSelect from "@frontend/components/ui/SearchableSelect";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiBox,
  FiChevronDown, FiUserCheck, FiArrowLeft,
} from "react-icons/fi";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category { _id: string; name: string; }
interface Vendor { _id: string; name: string; }
interface Product { _id: string; name: string; sku?: string; category: Category; vendor?: Vendor | null; }
interface Department { _id: string; name: string; code: string; }
interface Site { _id: string; name: string; }
interface UserOption { _id: string; name: string; email: string; site?: Site | null; department?: Department | null; }

interface Asset {
  _id: string;
  name: string;
  assetTag: string;
  product: Product;
  serialNumber?: string;
  vendor?: Vendor | null;
  purchaseCost?: number;
  acquisitionDate?: string;
  expiryDate?: string;
  warrantyExpiryDate?: string;
  barcodeQr?: string;
  location?: string;
  assetState: string;
  assignedTo?: UserOption | null;
  department?: Department | null;
  site?: Site | null;
  associatedTo?: Asset | null;
  retainSite: boolean;
  stateComments?: string;
  isNewDevice: boolean;
  assetCheck?: string;
  comment?: string;
  comment2?: string;
  conditionTag?: string;
  grade?: string;
  cell?: string;
  devicePurchase?: string;
  lastSeen?: string;
  numAuthDevices?: number;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTION = ({ title }: { title: string }) => (
  <div className="col-span-2 border-b border-gray-100 pb-1 mt-3">
    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h4>
  </div>
);

const ASSET_STATES = ["In Store", "Assigned", "Under Repair", "Retired", "Disposed", "Lost", "Missing"];

const stateClass: Record<string, string> = {
  "In Store": "bg-blue-100 text-blue-700",
  "Assigned": "bg-green-100 text-green-700",
  "Under Repair": "bg-yellow-100 text-yellow-700",
  "Retired": "bg-gray-100 text-gray-600",
  "Disposed": "bg-red-100 text-red-600",
  "Lost": "bg-orange-100 text-orange-700",
  "Missing": "bg-purple-100 text-purple-700",
};

const DetailRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:gap-4">
    <span className="text-xs text-gray-400 sm:w-40 shrink-0">{label}</span>
    <span className="text-sm text-gray-700 font-medium">{value || "—"}</span>
  </div>
);

const emptyForm = {
  name: "", assetTag: "", product: "", serialNumber: "", vendor: "",
  purchaseCost: "", acquisitionDate: "", expiryDate: "", warrantyExpiryDate: "",
  barcodeQr: "", location: "",
  assetState: "In Store", department: "", site: "", associatedTo: "",
  assignedUser: "",
  retainSite: false, stateComments: "",
  isNewDevice: true, assetCheck: "", comment: "", comment2: "",
  conditionTag: "", grade: "", cell: "", devicePurchase: "",
  lastSeen: "", numAuthDevices: "",
};

const emptyAssign = {
  associatedTo: "",
  assignedTo: "",
  department: "",
  site: "",
  retainSite: true,
  stateComments: "",
};

// ─── DateInput ────────────────────────────────────────────────────────────────

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <input ref={ref} type="date" className="input-field pr-10" value={value}
        onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => ref.current?.showPicker?.()}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        <FiChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AssetsPage() {
  const { isManager, isAdmin } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Detail panel
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ ...emptyAssign });
  const [assigning, setAssigning] = useState(false);

  const selectedProductObj = products.find((p) => p._id === form.product);

  // When a user is selected in assignForm, auto-fill site from user's site
  const selectedAssignUser = users.find((u) => u._id === assignForm.assignedTo);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterState) params.assetState = filterState;
      if (filterCategory) params.category = filterCategory;
      const res = await api.get("/assets", { params });
      setAssets(res.data.assets);
      // Update selected asset if it's open — use functional update to avoid
      // stale closure capturing selectedAsset in deps (which caused back nav to be undone)
      setSelectedAsset((prev) => {
        if (!prev) return null;
        const updated = res.data.assets.find((a: Asset) => a._id === prev._id);
        return updated ?? prev;
      });
    } finally { setLoading(false); }
  }, [search, filterState, filterCategory]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  useEffect(() => {
    Promise.all([
      api.get("/categories"),
      api.get("/vendors"),
      api.get("/products"),
      api.get("/departments"),
      api.get("/sites"),
      api.get("/assets"),
      api.get("/users").catch(() => ({ data: { users: [] } })),
    ]).then(([catRes, venRes, prodRes, deptRes, siteRes, assetRes, userRes]) => {
      setCategories(catRes.data.categories);
      setVendors(venRes.data.vendors);
      setProducts(prodRes.data.products);
      setDepartments(deptRes.data.departments);
      setSites(siteRes.data.sites);
      setAllAssets(assetRes.data.assets);
      setUsers(userRes.data.users);
    });
  }, []);

  const sf = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saf = <K extends keyof typeof emptyAssign>(key: K, value: (typeof emptyAssign)[K]) =>
    setAssignForm((prev) => ({ ...prev, [key]: value }));

  // ── Open assign modal pre-filled from current asset state
  const openAssign = (asset: Asset) => {
    setAssignForm({
      associatedTo: (asset.associatedTo as Asset | null)?._id || "",
      assignedTo: asset.assignedTo?._id || "",
      department: asset.department?._id || "",
      site: asset.site?._id || "",
      retainSite: asset.retainSite,
      stateComments: asset.stateComments || "",
    });
    setShowAssign(true);
  };

  // When user selection changes, auto-populate their site if retainSite is on
  const handleAssignUserChange = (userId: string) => {
    const userObj = users.find((u) => u._id === userId);
    saf("assignedTo", userId);
    // Clear department when user is picked (it's an OR condition)
    if (userId) saf("department", "");
    // Auto-fill site from user
    if (userId && assignForm.retainSite && userObj?.site) {
      saf("site", userObj.site._id);
    }
  };

  const handleAssignDeptChange = (deptId: string) => {
    saf("department", deptId);
    // Clear user when department is picked
    if (deptId) saf("assignedTo", "");
  };

  const handleRetainSiteChange = (checked: boolean) => {
    saf("retainSite", checked);
    if (checked && assignForm.assignedTo) {
      const userObj = users.find((u) => u._id === assignForm.assignedTo);
      if (userObj?.site) saf("site", userObj.site._id);
    }
  };

  const handleAssignSave = async () => {
    if (!selectedAsset) return;
    if (!assignForm.assignedTo && !assignForm.department) {
      toast.error("Select a user or a department to assign to");
      return;
    }
    setAssigning(true);
    try {
      // Resolve site: if retainSite + user selected, backend will auto-resolve;
      // otherwise send the manually chosen site
      const payload = {
        assignedTo: assignForm.assignedTo || null,
        department: assignForm.department || null,
        associatedTo: assignForm.associatedTo || null,
        site: assignForm.retainSite && assignForm.assignedTo ? null : assignForm.site || null,
        retainSite: assignForm.retainSite,
        stateComments: assignForm.stateComments,
      };
      const res = await api.post(`/assets/${selectedAsset._id}/assign`, payload);
      toast.success("Asset assigned successfully");
      setShowAssign(false);
      // Update selected asset with fresh data
      setSelectedAsset(res.data.asset);
      fetchAssets();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to assign asset");
    } finally { setAssigning(false); }
  };

  // ── Edit / Create
  const openCreate = () => {
    setEditAsset(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (asset: Asset) => {
    setEditAsset(asset);
    setForm({
      name: asset.name,
      assetTag: asset.assetTag,
      product: asset.product?._id || "",
      serialNumber: asset.serialNumber || "",
      vendor: asset.vendor?._id || "",
      purchaseCost: asset.purchaseCost?.toString() || "",
      acquisitionDate: asset.acquisitionDate ? asset.acquisitionDate.substring(0, 10) : "",
      expiryDate: asset.expiryDate ? asset.expiryDate.substring(0, 10) : "",
      warrantyExpiryDate: asset.warrantyExpiryDate ? asset.warrantyExpiryDate.substring(0, 10) : "",
      barcodeQr: asset.barcodeQr || "",
      location: asset.location || "",
      assetState: asset.assetState,
      department: asset.department?._id || "",
      site: asset.site?._id || "",
      associatedTo: (asset.associatedTo as Asset | null)?._id || "",
      assignedUser: asset.assignedTo?._id || "",
      retainSite: asset.retainSite,
      stateComments: asset.stateComments || "",
      isNewDevice: asset.isNewDevice,
      assetCheck: asset.assetCheck || "",
      comment: asset.comment || "",
      comment2: asset.comment2 || "",
      conditionTag: asset.conditionTag || "",
      grade: asset.grade || "",
      cell: asset.cell || "",
      devicePurchase: asset.devicePurchase || "",
      lastSeen: asset.lastSeen ? asset.lastSeen.substring(0, 10) : "",
      numAuthDevices: asset.numAuthDevices?.toString() || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.assetTag || !form.product) {
      toast.error("Name, asset tag, and product are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : null,
        numAuthDevices: form.numAuthDevices ? Number(form.numAuthDevices) : null,
        vendor: form.vendor || null,
        department: form.department || null,
        site: form.site || null,
        associatedTo: form.associatedTo || null,
        assignedTo: form.assetState === "Assigned" ? (form.assignedUser || null) : null,
        acquisitionDate: form.acquisitionDate || null,
        expiryDate: form.expiryDate || null,
        warrantyExpiryDate: form.warrantyExpiryDate || null,
        lastSeen: form.lastSeen || null,
      };
      if (editAsset) {
        const res = await api.put(`/assets/${editAsset._id}`, payload);
        toast.success("Asset updated");
        if (selectedAsset?._id === editAsset._id) setSelectedAsset(res.data.asset);
      } else {
        await api.post("/assets", payload);
        toast.success("Asset created");
      }
      setShowModal(false);
      fetchAssets();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to save asset");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/assets/${deleteId}`);
      toast.success("Asset deleted");
      setDeleteId(null);
      if (selectedAsset?._id === deleteId) setSelectedAsset(null);
      fetchAssets();
    } catch {
      toast.error("Failed to delete asset");
    } finally { setDeleting(false); }
  };

  // ── Resolved site to display in assign modal
  const resolvedSiteForDisplay = (() => {
    if (assignForm.retainSite && assignForm.assignedTo) {
      const userObj = users.find((u) => u._id === assignForm.assignedTo);
      return userObj?.site?.name || "—";
    }
    return sites.find((s) => s._id === assignForm.site)?.name || "—";
  })();

  // ── Detail panel view
  if (selectedAsset) {
    const a = selectedAsset;
    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "—";
    return (
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedAsset(null)}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <FiArrowLeft />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">{a.assetTag}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stateClass[a.assetState] || "bg-gray-100 text-gray-600"}`}>
                  {a.assetState}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                All Assets / {a.product?.category?.name || "Assets"} / {a.assetTag}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isManager && (
              <button onClick={() => openAssign(a)}
                className="btn-primary flex items-center gap-2">
                <FiUserCheck className="w-4 h-4" /> Assign
              </button>
            )}
            {isManager && (
              <button onClick={() => openEdit(a)}
                className="btn-secondary flex items-center gap-2">
                <FiEdit2 className="w-4 h-4" /> Edit
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setDeleteId(a._id)}
                className="btn-secondary flex items-center gap-2 text-red-500 hover:text-red-600">
                <FiTrash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Details card */}
        <div className="card p-6 space-y-6">
          {/* Header row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow label="Name" value={a.name} />
            <DetailRow label="Product" value={a.product?.name} />
          </div>

          {/* Asset Details section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">Asset Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Serial Number" value={a.serialNumber} />
              <DetailRow label="Asset Tag" value={a.assetTag} />
              <DetailRow label="Barcode / QR code" value={a.barcodeQr} />
              <DetailRow label="Vendor" value={a.vendor?.name} />
              <DetailRow label="Part No." value={undefined} />
              <DetailRow label="Purchase Cost" value={a.purchaseCost != null ? `${a.purchaseCost.toFixed(2)} C$` : undefined} />
              <DetailRow label="Acquisition Date" value={fmtDate(a.acquisitionDate)} />
              <DetailRow label="Expiry Date" value={fmtDate(a.expiryDate)} />
              <DetailRow label="Warranty Expiry Date" value={fmtDate(a.warrantyExpiryDate)} />
              <DetailRow label="Location" value={a.location} />
            </div>
          </div>

          {/* Asset State section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">Asset State</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="State" value={
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stateClass[a.assetState] || "bg-gray-100 text-gray-600"}`}>
                  {a.assetState}
                </span>
              } />
              <DetailRow label="User" value={a.assignedTo?.name} />
              <DetailRow label="Associated to Asset" value={(a.associatedTo as Asset | null)?.assetTag} />
              <DetailRow label="Department" value={a.department?.name} />
              <DetailRow label="Site" value={a.site?.name} />
              <DetailRow label="Retain Associated asset/User/Department's site" value={a.retainSite ? "Yes" : "No"} />
              <div className="sm:col-span-2">
                <DetailRow label="State Comments" value={a.stateComments} />
              </div>
            </div>
          </div>

          {/* Additional Asset Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">Additional Asset Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="New Device" value={a.isNewDevice ? "Yes" : "Not Assigned"} />
              <DetailRow label="Cell" value={a.cell} />
              <DetailRow label="Asset Check" value={a.assetCheck} />
              <DetailRow label="Comment2" value={a.comment2} />
              <DetailRow label="Comment" value={a.comment} />
              <DetailRow label="Device Purchase" value={a.devicePurchase} />
              <DetailRow label="Condition Tag" value={a.conditionTag} />
              <DetailRow label="Last Seen" value={fmtDate(a.lastSeen)} />
              <DetailRow label="Grades" value={a.grade} />
              <DetailRow label="Num Auth Devices" value={a.numAuthDevices?.toString()} />
            </div>
          </div>
        </div>

        {/* Edit Modal (shared) */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)}
          title={`Edit ${editAsset?.product?.category?.name || "Asset"}`} size="xl">
          <AssetFormBody
            form={form} sf={sf} products={products} vendors={vendors}
            departments={departments} sites={sites} allAssets={allAssets}
            editAsset={editAsset} selectedProductObj={selectedProductObj} users={users}
          />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? "Saving..." : "Update Asset"}
            </button>
          </div>
        </Modal>

        {/* Assign Modal */}
        <Modal isOpen={showAssign} onClose={() => setShowAssign(false)}
          title="Assign / Associate" size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Associated To</label>
              <SearchableSelect
                options={allAssets.filter((x) => x._id !== a._id).map((x) => ({ value: x._id, label: `${x.assetTag} — ${x.name}` }))}
                value={assignForm.associatedTo}
                onChange={(v) => saf("associatedTo", v)}
                placeholder="Select asset to associate"
                noneLabel="— None —"
              />
            </div>

            {/* OR condition: User vs Department */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User <span className="text-gray-400 font-normal text-xs">(or select department below)</span>
                </label>
                <SearchableSelect
                  options={users.map((u) => ({ value: u._id, label: `${u.name} (${u.email})` }))}
                  value={assignForm.assignedTo}
                  onChange={handleAssignUserChange}
                  placeholder="Select user"
                  noneLabel="— No User —"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Department <span className="text-gray-400 font-normal text-xs">(or select user above)</span>
                </label>
                <SearchableSelect
                  options={departments.map((d) => ({ value: d._id, label: d.name }))}
                  value={assignForm.department}
                  onChange={handleAssignDeptChange}
                  placeholder="Select department"
                  noneLabel="— No Department —"
                />
              </div>
            </div>

            {/* Site — readonly when retainSite is on */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              {assignForm.retainSite && assignForm.assignedTo ? (
                <div className="input-field bg-gray-50 text-gray-500 cursor-not-allowed">
                  {resolvedSiteForDisplay}
                </div>
              ) : (
                <SearchableSelect
                  options={sites.map((s) => ({ value: s._id, label: s.name }))}
                  value={assignForm.site}
                  onChange={(v) => saf("site", v)}
                  placeholder="Select site"
                  noneLabel="— No Site —"
                />
              )}
            </div>

            {/* Retain site checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="retainSiteAssign"
                checked={assignForm.retainSite}
                onChange={(e) => handleRetainSiteChange(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600"
              />
              <label htmlFor="retainSiteAssign" className="text-sm text-gray-600">
                Retain Associated asset/User/Department&apos;s site
              </label>
            </div>

            {/* Note when user auto-fills site */}
            {assignForm.retainSite && assignForm.assignedTo && selectedAssignUser?.site && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Note: To list all users, clear the selected department.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State Comments</label>
              <input
                className="input-field"
                value={assignForm.stateComments}
                onChange={(e) => saf("stateComments", e.target.value)}
                placeholder="Optional comments..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setShowAssign(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleAssignSave} disabled={assigning} className="btn-primary flex-1">
              {assigning ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>

        {/* Delete Confirm */}
        <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
          onConfirm={handleDelete} title="Delete Asset"
          message="Are you sure you want to delete this asset? This action cannot be undone."
          loading={deleting} />
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Asset Management</h2>
          <p className="text-sm text-gray-500">{assets.length} assets</p>
        </div>
        {isManager && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Asset
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" className="input-field pl-10" placeholder="Search by name, tag, serial..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-44" value={filterState} onChange={(e) => setFilterState(e.target.value)}>
          <option value="">All States</option>
          {ASSET_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-field sm:w-44" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiBox className="text-5xl mx-auto mb-3" />
            <p className="font-medium">No assets found</p>
            {isManager && <p className="text-sm mt-1">Click &quot;Add Asset&quot; to get started</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Asset Tag</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Product</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Category</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Vendor</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">State</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Assigned To</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Site</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Serial #</th>
                  {isManager && <th className="text-right py-3.5 px-4 text-gray-500 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map((asset) => (
                  <tr key={asset._id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAsset(asset)}>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600">{asset.assetTag}</td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">{asset.name}</td>
                    <td className="py-3.5 px-4 text-gray-600">{asset.product?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{asset.product?.category?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{asset.vendor?.name || asset.product?.vendor?.name || "—"}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stateClass[asset.assetState] || "bg-gray-100 text-gray-600"}`}>
                        {asset.assetState}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{asset.assignedTo?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{asset.site?.name || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-xs">{asset.serialNumber || "—"}</td>
                    {isManager && (
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(asset)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <FiEdit2 />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteId(asset._id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title="New Asset" size="xl">
        <AssetFormBody
          form={form} sf={sf} products={products} vendors={vendors}
          departments={departments} sites={sites} allAssets={allAssets}
          editAsset={editAsset} selectedProductObj={selectedProductObj} users={users}
        />
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving..." : "Create Asset"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} title="Delete Asset"
        message="Are you sure you want to delete this asset? This action cannot be undone."
        loading={deleting} />
    </div>
  );
}

// ─── Extracted form body (shared between create and edit modals) ──────────────

function AssetFormBody({
  form, sf, products, vendors, departments, sites, allAssets, editAsset, selectedProductObj, users,
}: {
  form: typeof emptyForm;
  sf: <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => void;
  products: Product[];
  vendors: Vendor[];
  departments: Department[];
  sites: Site[];
  allAssets: Asset[];
  editAsset: Asset | null;
  selectedProductObj: Product | undefined;
  users: UserOption[];
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input className="input-field" value={form.name} onChange={(e) => sf("name", e.target.value)} placeholder="e.g. F-0001" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
        <SearchableSelect allowNone={false}
          options={products.map((p) => ({ value: p._id, label: `${p.name}${p.sku ? ` (${p.sku})` : ""}` }))}
          value={form.product} onChange={(v) => sf("product", v)} placeholder="Select product" />
      </div>
      {selectedProductObj && (
        <div className="col-span-2 bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-500 flex gap-6 -mt-1">
          <span><span className="font-medium text-gray-700">Category:</span> {selectedProductObj.category?.name}</span>
          {selectedProductObj.vendor && <span><span className="font-medium text-gray-700">Vendor:</span> {selectedProductObj.vendor.name}</span>}
          {selectedProductObj.sku && <span><span className="font-medium text-gray-700">SKU:</span> {selectedProductObj.sku}</span>}
        </div>
      )}
      <SECTION title="Asset Details" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
        <input className="input-field" value={form.serialNumber} onChange={(e) => sf("serialNumber", e.target.value)} placeholder="Serial number" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag *</label>
        <input className="input-field" value={form.assetTag} onChange={(e) => sf("assetTag", e.target.value)} placeholder="e.g. F-0001" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
        <SearchableSelect options={vendors.map((v) => ({ value: v._id, label: v.name }))}
          value={form.vendor} onChange={(v) => sf("vendor", v)} placeholder="Select vendor" noneLabel="— No Vendor —" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Barcode / QR Code</label>
        <input className="input-field" value={form.barcodeQr} onChange={(e) => sf("barcodeQr", e.target.value)} placeholder="Barcode or QR value" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost</label>
        <div className="relative">
          <input type="number" min="0" step="0.01" className="input-field pr-8" value={form.purchaseCost}
            onChange={(e) => sf("purchaseCost", e.target.value)} placeholder="0.00" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
        <DateInput value={form.acquisitionDate} onChange={(v) => sf("acquisitionDate", v)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
        <DateInput value={form.expiryDate} onChange={(v) => sf("expiryDate", v)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry Date</label>
        <DateInput value={form.warrantyExpiryDate} onChange={(v) => sf("warrantyExpiryDate", v)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input className="input-field" value={form.location} onChange={(e) => sf("location", e.target.value)} placeholder="e.g. Office A, Floor 2" />
      </div>
      <SECTION title="Asset State" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asset is Currently *</label>
        <select className="input-field" value={form.assetState} onChange={(e) => sf("assetState", e.target.value)}>
          {ASSET_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Associated To</label>
        <SearchableSelect
          options={allAssets.filter((a) => a._id !== editAsset?._id).map((a) => ({ value: a._id, label: `${a.assetTag} — ${a.name}` }))}
          value={form.associatedTo} onChange={(v) => sf("associatedTo", v)}
          placeholder="Select asset to associate" noneLabel="— None —" />
      </div>

      {/* Conditional assignment fields — only show when state is Assigned */}
      {form.assetState === "Assigned" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to User <span className="text-gray-400 font-normal text-xs">(or assign to Site below)</span>
            </label>
            <SearchableSelect
              options={users.map((u) => ({ value: u._id, label: `${u.name} (${u.email})` }))}
              value={form.assignedUser || ""}
              onChange={(v) => sf("assignedUser" as keyof typeof emptyForm, v)}
              placeholder="Select user"
              noneLabel="— No User —"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Site <span className="text-gray-400 font-normal text-xs">(or assign to user above)</span>
            </label>
            <SearchableSelect options={sites.map((s) => ({ value: s._id, label: s.name }))}
              value={form.site} onChange={(v) => sf("site", v)}
              placeholder="Select site" noneLabel="— No Site —" />
          </div>
        </>
      )}

      {form.assetState !== "Assigned" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
          <SearchableSelect options={sites.map((s) => ({ value: s._id, label: s.name }))}
            value={form.site} onChange={(v) => sf("site", v)}
            placeholder="Select site" noneLabel="— Select Site —" />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <SearchableSelect options={departments.map((d) => ({ value: d._id, label: d.name }))}
          value={form.department} onChange={(v) => sf("department", v)}
          placeholder="Select department" noneLabel="— Select Department —" />
      </div>
      <div className="col-span-2 flex items-center gap-2 mt-1">
        <input type="checkbox" id="retainSiteEdit" checked={form.retainSite}
          onChange={(e) => sf("retainSite", e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-600" />
        <label htmlFor="retainSiteEdit" className="text-sm text-gray-600">
          Retain Associated asset/User/Department&apos;s site
        </label>
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">State Comments</label>
        <input className="input-field" value={form.stateComments}
          onChange={(e) => sf("stateComments", e.target.value)} placeholder="Comments about current state..." />
      </div>
      <SECTION title="Additional Asset Details" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Device</label>
        <select className="input-field" value={form.isNewDevice ? "true" : "false"}
          onChange={(e) => sf("isNewDevice", e.target.value === "true")}>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cell</label>
        <input className="input-field" value={form.cell} onChange={(e) => sf("cell", e.target.value)} placeholder="Enter phone number" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Check</label>
        <input className="input-field" value={form.assetCheck} onChange={(e) => sf("assetCheck", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comment 2</label>
        <input className="input-field" value={form.comment2} onChange={(e) => sf("comment2", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
        <input className="input-field" value={form.comment} onChange={(e) => sf("comment", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Device Purchase</label>
        <input className="input-field" value={form.devicePurchase} onChange={(e) => sf("devicePurchase", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Condition Tag</label>
        <input className="input-field" value={form.conditionTag} onChange={(e) => sf("conditionTag", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Last Seen</label>
        <DateInput value={form.lastSeen} onChange={(v) => sf("lastSeen", v)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
        <input className="input-field" value={form.grade} onChange={(e) => sf("grade", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Num Auth Devices</label>
        <input type="number" min="0" className="input-field" value={form.numAuthDevices}
          onChange={(e) => sf("numAuthDevices", e.target.value)} />
      </div>
    </div>
  );
}
