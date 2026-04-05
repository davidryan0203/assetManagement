"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@backend/lib/api";
import { useAuth } from "@frontend/context/AuthContext";
import toast from "react-hot-toast";
import Modal from "@frontend/components/ui/Modal";
import { FiPlus, FiSearch, FiClipboard } from "react-icons/fi";
import SearchableSelect from "@frontend/components/ui/SearchableSelect";

type Consumable = {
  _id: string;
  name: string;
  assetTag: string;
  quantity?: number;
  product?: { _id: string; name: string; category?: { _id: string; name: string } | null } | null;
  site?: { _id: string; name: string } | null;
};

type IssueLog = {
  _id: string;
  quantity: number;
  issuedTo?: string;
  notes?: string;
  createdAt: string;
  consumable: {
    _id: string;
    name: string;
    assetTag: string;
    quantity?: number;
    site?: { _id: string; name: string } | null;
    product?: { _id: string; name: string; category?: { _id: string; name: string } | null } | null;
  };
  issuedBy: { _id: string; name: string; email: string };
};

const emptyIssueForm = {
  consumableId: "",
  quantity: "1",
  issuedTo: "",
  notes: "",
};

export default function ConsumableIssuesPage() {
  const { isAdmin } = useAuth();
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [logs, setLogs] = useState<IssueLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ ...emptyIssueForm });
  const [issuing, setIssuing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [consumablesRes, logsRes] = await Promise.all([
        api.get("/assets", { params: { kind: "Consumable" } }),
        api.get("/consumable-issues"),
      ]);
      setConsumables(consumablesRes.data.assets || []);
      setLogs(logsRes.data.logs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedConsumable = useMemo(
    () => consumables.find((c) => c._id === issueForm.consumableId),
    [consumables, issueForm.consumableId]
  );

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      return (
        log.consumable.name.toLowerCase().includes(q) ||
        log.consumable.assetTag.toLowerCase().includes(q) ||
        (log.issuedTo || "").toLowerCase().includes(q) ||
        log.issuedBy.name.toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  const handleIssue = async () => {
    const quantity = Number(issueForm.quantity);
    if (!issueForm.consumableId || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Select consumable and valid quantity");
      return;
    }

    setIssuing(true);
    try {
      const res = await api.post("/consumable-issues", {
        consumableId: issueForm.consumableId,
        quantity,
        issuedTo: issueForm.issuedTo,
        notes: issueForm.notes,
      });
      toast.success(`Issued successfully. Remaining: ${res.data.remainingQuantity}`);
      setIssueForm({ ...emptyIssueForm });
      setShowIssueModal(false);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to issue consumable");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Consumable Issues</h2>
          <p className="text-sm text-gray-500">{filteredLogs.length} logs</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowIssueModal(true)} className="btn-primary flex items-center gap-2">
            <FiPlus /> Issue Consumable
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiClipboard className="text-5xl mx-auto mb-3" />
            <p className="font-medium">No issue logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Consumable</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Tag</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Issued Qty</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Issued To</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Issued By</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-3.5 px-4 text-gray-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4 text-gray-800 font-medium">{log.consumable.name}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{log.consumable.assetTag}</td>
                    <td className="py-3.5 px-4 text-gray-800">{log.quantity}</td>
                    <td className="py-3.5 px-4 text-gray-600">{log.issuedTo || "—"}</td>
                    <td className="py-3.5 px-4 text-gray-600">{log.issuedBy.name}</td>
                    <td className="py-3.5 px-4 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-gray-500">{log.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Issue Consumable" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consumable *</label>
            <SearchableSelect
              allowNone={false}
              options={consumables.map((c) => ({
                value: c._id,
                label: `${c.name} (${c.assetTag}) - Qty: ${c.quantity ?? 0}`,
              }))}
              value={issueForm.consumableId}
              onChange={(v) => setIssueForm((p) => ({ ...p, consumableId: v }))}
              placeholder="Select consumable"
            />
          </div>

          {selectedConsumable && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Available quantity: <span className="font-semibold text-gray-800">{selectedConsumable.quantity ?? 0}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              className="input-field"
              value={issueForm.quantity}
              onChange={(e) => setIssueForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issued To</label>
            <input
              className="input-field"
              value={issueForm.issuedTo}
              onChange={(e) => setIssueForm((p) => ({ ...p, issuedTo: e.target.value }))}
              placeholder="Employee / Team / Department"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="input-field"
              rows={3}
              value={issueForm.notes}
              onChange={(e) => setIssueForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowIssueModal(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleIssue} disabled={issuing} className="btn-primary flex-1">
            {issuing ? "Issuing..." : "Issue"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
