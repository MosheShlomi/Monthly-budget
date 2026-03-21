import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Family, FamilyMember } from "@/types";

interface FamilyState {
  currentFamily: Family | null;
  members: FamilyMember[];
  setFamily: (family: Family | null) => void;
  setMembers: (members: FamilyMember[]) => void;
  clear: () => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      currentFamily: null,
      members: [],
      setFamily: (family) => set({ currentFamily: family }),
      setMembers: (members) => set({ members }),
      clear: () => set({ currentFamily: null, members: [] }),
    }),
    {
      name: "family-storage",
    }
  )
);
