export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface Trip {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  invite_code: string;
  created_by: number;
  created_at: string;
  members?: TripMember[];
}

export interface TripMember {
  id: number;
  trip_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role: 'owner' | 'member';
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
}

export interface JoinRequest {
  id: number;
  trip_id: number;
  trip_name?: string;
  user_id: number;
  user_name: string;
  user_email: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

export interface ExpenseSplit {
  id: number;
  expense_id: number;
  user_id: number;
  user_name?: string;
  amount: number;
}

export interface Expense {
  id: number;
  trip_id: number;
  paid_by: number;
  payer_name: string;
  amount: number;
  description: string;
  category: 'food' | 'transport' | 'stay' | 'activity' | 'other';
  expense_date?: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface StayOption {
  id: number;
  trip_id: number;
  title: string;
  link: string;
  price: number;
  notes: string;
  added_by: number;
  added_by_name?: string;
  created_at: string;
  votes?: Vote[];
  total_score?: number;
  vote_count?: number;
  image_path?: string;
  image_url?: string;
  link_title?: string;
  link_description?: string;
  check_in_date?: string;
  check_out_date?: string;
  category?: OptionCategory;
  is_finalized?: boolean;
}

export interface OptionsByDate {
  date: string | null;
  options: StayOption[];
}

export interface ExpensesByDate {
  date: string | null;
  expenses: Expense[];
  total: number;
  by_category: Record<string, number>;
}

export interface BudgetByDate {
  date: string;
  total: number;
  per_person: number;
  by_category: Record<string, number>;
  expense_count: number;
}

export type OptionCategory = 'stay' | 'activity' | 'transport' | 'food';

export interface Vote {
  id: number;
  option_id: number;
  user_id: number;
  user_name: string;
  score: number;
  created_at: string;
  updated_at?: string;
}

export interface RankedOption {
  option: StayOption;
  total_score: number;
  vote_count: number;
  average_score: number;
  voters: { user_id: number; user_name: string; score: number }[];
  rank: number;
}

export interface Budget {
  total_expenses: number;
  member_count: number;
  per_person_average: number;
  expense_count: number;
  by_category: Record<string, number>;
  by_payer: Record<string, number>;
}

export interface Balance {
  user_id: number;
  user_name: string;
  balance: number;
  status: 'owed' | 'owes' | 'settled';
  total_paid?: number;
  total_share?: number;
  expenses_paid?: number;
}

export interface SettlementExplanation {
  how_it_works: string;
  settlement_method: string;
  total_expenses: number;
  member_count: number;
  per_person_average: number;
}

export interface Settlement {
  from_user_id: number;
  from_user_name: string;
  to_user_id: number;
  to_user_name: string;
  amount: number;
}

export interface SettlementData {
  balances: Balance[];
  settlements: Settlement[];
  explanation?: SettlementExplanation;
}

export type ExpenseCategory = 'food' | 'transport' | 'stay' | 'activity' | 'other';
