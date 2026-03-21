"use client";

import { useEffect, useState } from "react";
import { Plus, CreditCard, Pencil, Trash2 } from "lucide-react";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import type { Card as CardType } from "@/types";

export default function CardsPage() {
  const { currentFamily } = useFamilyStore();
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CardType | null>(null);
  const [cardName, setCardName] = useState("");
  const [saving, setSaving] = useState(false);


  async function loadCards() {
    if (!currentFamily) return;
    setLoading(true);
    try {
      const data = await apiFetch<CardType[]>(`/api/v1/families/${currentFamily.id}/cards`);
      setCards(data);
    } catch {
      toast.error("שגיאה בטעינת כרטיסי אשראי");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
  }, [currentFamily]);

  function openCreate() {
    setEditTarget(null);
    setCardName("");
    setFormOpen(true);
  }

  function openEdit(card: CardType) {
    setEditTarget(card);
    setCardName(card.name);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!currentFamily || !cardName.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await apiFetch(`/api/v1/families/${currentFamily.id}/cards/${editTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: cardName.trim() }),
        });
        toast.success("כרטיס עודכן");
      } else {
        await apiFetch(`/api/v1/families/${currentFamily.id}/cards`, {
          method: "POST",
          body: JSON.stringify({ name: cardName.trim() }),
        });
        toast.success("כרטיס נוסף");
      }
      setFormOpen(false);
      loadCards();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(card: CardType) {
    if (!currentFamily) return;
    try {
      await apiFetch(`/api/v1/families/${currentFamily.id}/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !card.is_active }),
      });
      toast.success(card.is_active ? `"${card.name}" הושבת` : `"${card.name}" הופעל`);
      loadCards();
    } catch {
      toast.error("שגיאה בעדכון כרטיס");
    }
  }

  function handleDelete(card: CardType) {
    if (!currentFamily) return;
    toast(`למחוק את "${card.name}"?`, {
      action: {
        label: "מחק",
        onClick: async () => {
          try {
            await apiFetch(`/api/v1/families/${currentFamily.id}/cards/${card.id}`, {
              method: "DELETE",
            });
            toast.success("כרטיס נמחק");
            loadCards();
          } catch {
            toast.error("שגיאה במחיקת כרטיס");
          }
        },
      },
      cancel: { label: "ביטול", onClick: () => {} },
    });
  }

  if (!currentFamily) {
    return <div className="text-center py-20 text-slate-400">אין משפחה מחוברת</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">כרטיסי אשראי</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          כרטיס חדש
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : cards.length === 0 ? (
        <Card className="text-center py-12">
          <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">לא נוספו כרטיסי אשראי עדיין</p>
          <Button onClick={openCreate} className="mt-4" variant="outline">
            הוסף כרטיס ראשון
          </Button>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-slate-100">
            {cards.map((card) => (
              <div key={card.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 group">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{card.name}</p>
                  <Badge color={card.is_active ? "#22c55e" : "#6b7280"} className="mt-0.5">
                    {card.is_active ? "פעיל" : "לא פעיל"}
                  </Badge>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleActive(card)}
                    className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                  >
                    {card.is_active ? "השבת" : "הפעל"}
                  </button>
                  <button
                    onClick={() => openEdit(card)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(card)}
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "עריכת כרטיס" : "כרטיס חדש"}
      >
        <div className="space-y-4">
          <Input
            label="שם הכרטיס"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="לדוגמה: ויזה כאל"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <div className="flex gap-3">
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
