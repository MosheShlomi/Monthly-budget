export interface Family {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  role: "owner" | "member";
  family_status: string | null;
  joined_at: string;
}

export interface FamilyInvite {
  id: string;
  token: string;
  email: string;
  family_id: string;
  expires_at: string;
  used: boolean;
}

export interface Category {
  id: string;
  family_id: string | null;
  user_id: string | null;
  name: string;
  color: string;
  is_default: boolean;
  type: "expense" | "income";
}

export interface Card {
  id: string;
  family_id: string;
  name: string;
  is_active: boolean;
}

export interface Spending {
  id: string;
  family_id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  amount: string;
  category_id: string;
  payment_method: "cash" | "card";
  card_id: string | null;
  date: string;
  notes: string | null;
  created_at: string;
  category_name?: string;
  category_color?: string;
  card_name?: string;
}

export interface BudgetGoal {
  id: string;
  family_id: string;
  category_id: string;
  month: number;
  year: number;
  limit_amount: string;
  spent?: string;
  category_name?: string;
  category_color?: string;
  category_type?: "expense" | "income";
}

export interface CategoryTotal {
  category_id: string;
  category_name: string;
  category_color: string;
  total: string;
}

export interface MemberTotal {
  user_id: string;
  user_email: string;
  user_name: string | null;
  total: string;
}

export interface MonthlyBar {
  month: number;
  year: number;
  total: string;
  income: string;
}

export interface DashboardSummary {
  total_spent: string;
  total_income: string;
  net_savings: string;
  by_category: CategoryTotal[];
  income_by_category: CategoryTotal[];
  by_member: MemberTotal[];
  by_payment_method: Record<string, string>;
  monthly_bars: MonthlyBar[];
}

export interface Income {
  id: string;
  family_id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  amount: string;
  category_id: string | null;
  date: string;
  notes: string | null;
  created_at: string;
  category_name?: string;
  category_color?: string;
}

export interface IncomeCreate {
  amount: number;
  category_id?: string | null;
  date: string;
  notes?: string;
}

export interface IncomeFilters {
  months?: number[];
  years?: number[];
  category_ids?: string[];
  user_ids?: string[];
}

export interface SpendingCreate {
  amount: number;
  category_id: string;
  payment_method: "cash" | "card";
  card_id?: string | null;
  date: string;
  notes?: string;
}

export interface SpendingFilters {
  months?: number[];
  years?: number[];
  category_ids?: string[];
  user_ids?: string[];
}
