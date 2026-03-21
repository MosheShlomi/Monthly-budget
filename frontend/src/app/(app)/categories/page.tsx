"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import { clsx } from "clsx";
import type { Category } from "@/types";
import { HexColorPicker } from "react-colorful";

type Tab = "expense" | "income";

export default function CategoriesPage() {
  const { currentFamily } = useFamilyStore();
  const [tab, setTab] = useState<Tab>("expense");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.id) setCurrentUserId(data.session.user.id);
    });
  }, []);

  async function loadCategories() {
    if (!currentFamily) return;
    setLoading(true);
    try {
      const cats = await apiFetch<Category[]>(
        `/api/v1/families/${currentFamily.id}/categories?type=${tab}`
      );
      setCategories(cats);
    } catch {
      toast.error("שגיאה בטעינת קטגוריות");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, [currentFamily, tab]);

  function openCreate() {
    setEditTarget(null);
    setName("");
    setColor(tab === "expense" ? "#6366f1" : "#10b981");
    setFormOpen(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setName(cat.name);
    setColor(cat.color);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!currentFamily || !name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await apiFetch(`/api/v1/families/${currentFamily.id}/categories/${editTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim(), color }),
        });
        toast.success("קטגוריה עודכנה");
      } else {
        await apiFetch(`/api/v1/families/${currentFamily.id}/categories`, {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), color, type: tab }),
        });
        toast.success("קטגוריה נוספה");
      }
      setFormOpen(false);
      loadCategories();
    } catch {
      toast.error("שגיאה");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(cat: Category) {
    if (!currentFamily) return;
    const label = cat.is_default ? "הסתר" : "מחק";
    const msg = cat.is_default
      ? `להסתיר את "${cat.name}" מהרשימה שלך?`
      : `למחוק את "${cat.name}"?`;

    toast(msg, {
      action: {
        label,
        onClick: async () => {
          try {
            await apiFetch(`/api/v1/families/${currentFamily.id}/categories/${cat.id}`, {
              method: "DELETE",
            });
            toast.success(cat.is_default ? `"${cat.name}" הוסתרה` : `"${cat.name}" נמחקה`);
            loadCategories();
          } catch {
            toast.error("לא ניתן למחוק קטגוריה זו");
          }
        },
      },
      cancel: {
        label: "ביטול",
        onClick: () => {},
      },
    });
  }

  if (!currentFamily) {
    return <div className="text-center py-20 text-slate-400">אין משפחה מחוברת</div>;
  }

  const defaultCats = categories.filter((c) => c.is_default);
  const customCats = categories.filter((c) => !c.is_default);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">קטגוריות</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          קטגוריה חדשה
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("expense")}
          className={clsx(
            "px-5 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "expense"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          הוצאות
        </button>
        <button
          onClick={() => setTab("income")}
          className={clsx(
            "px-5 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "income"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          הכנסות
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          {/* Custom categories */}
          {customCats.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold text-slate-700 mb-4">קטגוריות שלי</h2>
              <div className="space-y-2">
                {customCats.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 group">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm font-medium text-slate-700">{cat.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Default categories */}
          <Card>
            <h2 className="text-sm font-semibold text-slate-700 mb-1">קטגוריות ברירת מחדל</h2>
            <p className="text-xs text-slate-400 mb-4">לחץ על X להסתרה מהרשימה שלך</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {defaultCats.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl group relative"
                  style={{ backgroundColor: `${cat.color}18` }}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: cat.color }}>
                    {cat.name}
                  </span>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/10"
                    style={{ color: cat.color }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            {defaultCats.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                הסתרת את כל קטגוריות ברירת המחדל
              </p>
            )}
          </Card>
        </>
      )}

      {/* Form modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "עריכת קטגוריה" : `קטגוריה חדשה — ${tab === "expense" ? "הוצאות" : "הכנסות"}`}
      >
        <div className="space-y-4">
          <Input
            label="שם הקטגוריה"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: ספורט"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">צבע</label>
            <HexColorPicker color={color} onChange={setColor} style={{ width: "100%" }} />
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-8 rounded-lg border" style={{ backgroundColor: color }} />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-32 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editTarget ? "עדכן" : "הוסף"}
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(false)} className="flex-1">
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
