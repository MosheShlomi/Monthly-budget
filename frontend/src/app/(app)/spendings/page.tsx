"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useFamilyStore } from "@/store/familyStore";
import { fmt } from "@/lib/format";
import { useSpendings } from "@/hooks/useSpendings";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { SpendingForm } from "@/components/spendings/SpendingForm";
import { SpendingList } from "@/components/spendings/SpendingList";
import { SpendingFilters } from "@/components/spendings/SpendingFilters";
import type { Category, Spending, SpendingCreate, SpendingFilters as Filters } from "@/types";

export default function SpendingsPage() {
  const { currentFamily, members } = useFamilyStore();
  const { spendings, loading, fetchSpendings, createSpending, updateSpending, deleteSpending } =
    useSpendings(currentFamily?.id ?? null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Spending | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const now = new Date();
  const [filters, setFilters] = useState<Filters>({
    months: [now.getMonth() + 1],
    years: [now.getFullYear()],
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.id) setCurrentUserId(data.session.user.id);
    });
  }, []);

  useEffect(() => {
    if (currentFamily) {
      apiFetch<Category[]>(`/api/v1/families/${currentFamily.id}/categories?type=expense`)
        .then(setCategories)
        .catch(() => {});
    }
  }, [currentFamily]);

  useEffect(() => {
    fetchSpendings(filters);
  }, [fetchSpendings, filters]);

  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === "owner";

  async function handleSave(data: SpendingCreate): Promise<Spending | null> {
    if (editTarget) {
      const ok = await updateSpending(editTarget.id, data);
      return ok ? { ...editTarget, ...data, amount: String(data.amount) } as Spending : null;
    }
    return createSpending(data);
  }

  function handleEdit(spending: Spending) {
    setEditTarget(spending);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditTarget(null);
  }

  const total = spendings.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  if (!currentFamily) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>אין משפחה מחוברת. <a href="/family" className="text-primary-600">צור משפחה</a></p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">הוצאות</h1>
          {spendings.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {spendings.length} רשומות · סה&quot;כ <span dir="ltr">{fmt(total, "-")}</span>
            </p>
          )}
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          הוצאה חדשה
        </Button>
      </div>

      <SpendingFilters
        filters={filters}
        onFilterChange={setFilters}
        categories={categories}
        members={members}
      />

      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="px-4 py-2">
            <SpendingList
              spendings={spendings}
              onEdit={handleEdit}
              onDelete={deleteSpending}
              currentUserId={currentUserId}
              isOwner={!!isOwner}
            />
          </div>
        )}
      </Card>

      <SpendingForm
        open={formOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        familyId={currentFamily.id}
        initial={editTarget}
      />
    </div>
  );
}
