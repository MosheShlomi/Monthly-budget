"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Spending, SpendingCreate, SpendingFilters } from "@/types";
import { toast } from "sonner";

export function useSpendings(familyId: string | null) {
  const [spendings, setSpendings] = useState<Spending[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSpendings = useCallback(
    async (filters: SpendingFilters = {}) => {
      if (!familyId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        filters.months?.forEach((m) => params.append("month", String(m)));
        filters.years?.forEach((y) => params.append("year", String(y)));
        filters.category_ids?.forEach((id) => params.append("category_id", id));
        filters.user_ids?.forEach((id) => params.append("user_id", id));

        const data = await apiFetch<Spending[]>(
          `/api/v1/families/${familyId}/spendings?${params.toString()}`
        );
        setSpendings(data);
      } catch (e: unknown) {
        toast.error("שגיאה בטעינת הוצאות");
      } finally {
        setLoading(false);
      }
    },
    [familyId]
  );

  const createSpending = async (data: SpendingCreate): Promise<Spending | null> => {
    if (!familyId) return null;
    try {
      const s = await apiFetch<Spending>(
        `/api/v1/families/${familyId}/spendings`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      setSpendings((prev) => [s, ...prev]);
      toast.success("הוצאה נוספה בהצלחה");
      return s;
    } catch (e: unknown) {
      toast.error("שגיאה בהוספת הוצאה");
      return null;
    }
  };

  const updateSpending = async (
    id: string,
    data: Partial<SpendingCreate>
  ): Promise<boolean> => {
    if (!familyId) return false;
    try {
      const updated = await apiFetch<Spending>(
        `/api/v1/families/${familyId}/spendings/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      setSpendings((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast.success("הוצאה עודכנה");
      return true;
    } catch {
      toast.error("שגיאה בעדכון הוצאה");
      return false;
    }
  };

  const deleteSpending = async (id: string): Promise<boolean> => {
    if (!familyId) return false;
    try {
      await apiFetch(`/api/v1/families/${familyId}/spendings/${id}`, {
        method: "DELETE",
      });
      setSpendings((prev) => prev.filter((s) => s.id !== id));
      toast.success("הוצאה נמחקה");
      return true;
    } catch {
      toast.error("שגיאה במחיקת הוצאה");
      return false;
    }
  };

  return {
    spendings,
    loading,
    fetchSpendings,
    createSpending,
    updateSpending,
    deleteSpending,
  };
}
