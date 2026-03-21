"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Income, IncomeCreate, IncomeFilters } from "@/types";
import { toast } from "sonner";

export function useIncomes(familyId: string | null) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIncomes = useCallback(
    async (filters: IncomeFilters = {}) => {
      if (!familyId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        filters.months?.forEach((m) => params.append("month", String(m)));
        filters.years?.forEach((y) => params.append("year", String(y)));
        filters.category_ids?.forEach((id) => params.append("category_id", id));
        filters.user_ids?.forEach((id) => params.append("user_id", id));

        const data = await apiFetch<Income[]>(
          `/api/v1/families/${familyId}/incomes?${params.toString()}`
        );
        setIncomes(data);
      } catch {
        toast.error("שגיאה בטעינת הכנסות");
      } finally {
        setLoading(false);
      }
    },
    [familyId]
  );

  const createIncome = async (data: IncomeCreate): Promise<Income | null> => {
    if (!familyId) return null;
    try {
      const i = await apiFetch<Income>(
        `/api/v1/families/${familyId}/incomes`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      setIncomes((prev) => [i, ...prev]);
      toast.success("הכנסה נוספה בהצלחה");
      return i;
    } catch {
      toast.error("שגיאה בהוספת הכנסה");
      return null;
    }
  };

  const updateIncome = async (
    id: string,
    data: Partial<IncomeCreate>
  ): Promise<boolean> => {
    if (!familyId) return false;
    try {
      const updated = await apiFetch<Income>(
        `/api/v1/families/${familyId}/incomes/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      setIncomes((prev) => prev.map((i) => (i.id === id ? updated : i)));
      toast.success("הכנסה עודכנה");
      return true;
    } catch {
      toast.error("שגיאה בעדכון הכנסה");
      return false;
    }
  };

  const deleteIncome = async (id: string): Promise<boolean> => {
    if (!familyId) return false;
    try {
      await apiFetch(`/api/v1/families/${familyId}/incomes/${id}`, {
        method: "DELETE",
      });
      setIncomes((prev) => prev.filter((i) => i.id !== id));
      toast.success("הכנסה נמחקה");
      return true;
    } catch {
      toast.error("שגיאה במחיקת הכנסה");
      return false;
    }
  };

  return {
    incomes,
    loading,
    fetchIncomes,
    createIncome,
    updateIncome,
    deleteIncome,
  };
}
