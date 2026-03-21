"use client";

import { useEffect } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import type { Family, FamilyMember } from "@/types";

export function useFamily() {
  const { currentFamily, members, setFamily, setMembers } = useFamilyStore();

  async function loadFamily() {
    try {
      const family = await apiFetch<Family>("/api/v1/families/me");
      setFamily(family);
      const mems = await apiFetch<FamilyMember[]>(
        `/api/v1/families/${family.id}/members`
      );
      setMembers(mems);
    } catch {
      setFamily(null);
      setMembers([]);
    }
  }

  return { currentFamily, members, loadFamily };
}
