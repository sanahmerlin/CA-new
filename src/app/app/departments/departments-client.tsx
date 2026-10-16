"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, MoreVertical, Edit2, Trash2, ChevronRight, AlertCircle, Users } from "lucide-react";
import { createDepartment, renameDepartment, deleteDepartment } from "./actions";
import { t } from "@/lib/i18n";

interface Department {
  id: string;
  name: string;
  created_at: string;
  patient_count?: number;
}

export function DepartmentsClient({
  departments,
}: {
  departments: Department[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    const res = await createDepartment(newName);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setNewName("");
      setIsCreateOpen(false);
    }
  };

  // Rename Handler
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editName.trim()) return;
    setLoading(true);
    setError(null);
    const res = await renameDepartment(editingDept.id, editName);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setEditingDept(null);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!deletingDept) return;
    setLoading(true);
    setError(null);
    const res = await deleteDepartment(deletingDept.id);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setDeletingDept(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header with New Department Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("departments.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("departments.subtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          {t("departments.addDepartment")}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Department Cards Grid */}
      {departments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-400 mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            {t("departments.emptyState")}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {t("departments.emptyStateDescription")}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("departments.addDepartment")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      title={t("common.edit")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDept(dept);
                        setEditName(dept.name);
                        setError(null);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title={t("common.delete")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingDept(dept);
                        setError(null);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/app/departments/${dept.id}`}
                    className="text-base font-bold text-slate-900 hover:text-teal-600 transition-colors block truncate"
                  >
                    {dept.name}
                  </Link>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {dept.patient_count ?? 0} {dept.patient_count === 1 ? "enrolled patient" : "enrolled patients"}
                    </span>
                  </p>
                </div>
              </div>

              <Link
                href={`/app/departments/${dept.id}`}
                className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center justify-between group-hover:bg-teal-50/50 transition-colors"
              >
                <span>View Department</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {t("departments.createTitle")}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t("departments.createDescription")}
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t("departments.nameLabel")}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={t("departments.namePlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {loading ? t("common.loading") : t("common.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {t("departments.renameTitle")}
            </h3>
            <form onSubmit={handleRename} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t("departments.nameLabel")}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {loading ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {t("common.confirmDelete")}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {t("common.confirmDeleteDescription")} (Department: <strong>{deletingDept.name}</strong>)
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                {loading ? t("common.loading") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
