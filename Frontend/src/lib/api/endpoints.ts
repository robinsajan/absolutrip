import api from './client';
import type {
  User,
  Trip,
  TripMember,
  JoinRequest,
  Expense,
  StayOption,
  Vote,
  RankedOption,
  Budget,
  SettlementData,
  ExpenseCategory,
  OptionCategory,
  OptionsByDate,
  ExpensesByDate,
  BudgetByDate,
  PersonalSettlementData,
} from '@/types';

export const auth = {
  register: async (data: { email: string; password: string; name: string }) => {
    const res = await api.post<{ message: string; user: User }>('/auth/register', data);
    return res.data;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await api.post<{ message: string; user: User }>('/auth/login', data);
    return res.data;
  },

  logout: async () => {
    const res = await api.post<{ message: string }>('/auth/logout');
    return res.data;
  },

  me: async () => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data;
  },
};

export const trips = {
  list: async () => {
    const res = await api.get<{ trips: Trip[] }>('/trips');
    return res.data;
  },

  create: async (data: { name: string; start_date: string; end_date: string; google_maps_url?: string }) => {
    const res = await api.post<{ message: string; trip: Trip }>('/trips', data);
    return res.data;
  },

  get: async (tripId: number) => {
    const res = await api.get<{ trip: Trip }>(`/trips/${tripId}`);
    return res.data;
  },

  update: async (tripId: number, data: Partial<{ name: string; start_date: string; end_date: string; google_maps_url: string }>) => {
    const res = await api.put<{ message: string; trip: Trip }>(`/trips/${tripId}`, data);
    return res.data;
  },

  delete: async (tripId: number) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}`);
    return res.data;
  },

  join: async (inviteCode: string) => {
    const res = await api.post<{ message: string; trip?: Trip; status: string }>(`/trips/join/${inviteCode}`);
    return res.data;
  },

  getMembers: async (tripId: number) => {
    const res = await api.get<{ members: TripMember[] }>(`/trips/${tripId}/members`);
    return res.data;
  },

  removeMember: async (tripId: number, userId: number) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}/members/${userId}`);
    return res.data;
  },

  getJoinRequests: async (tripId: number) => {
    const res = await api.get<{ requests: JoinRequest[] }>(`/trips/${tripId}/join-requests`);
    return res.data;
  },

  approveJoinRequest: async (tripId: number, requestId: number) => {
    const res = await api.post<{ message: string; member: TripMember }>(
      `/trips/${tripId}/join-requests/${requestId}/approve`
    );
    return res.data;
  },

  rejectJoinRequest: async (tripId: number, requestId: number) => {
    const res = await api.post<{ message: string }>(
      `/trips/${tripId}/join-requests/${requestId}/reject`
    );
    return res.data;
  },

  getMyRequests: async () => {
    const res = await api.get<{ requests: { id: number; trip_id: number; trip_name: string; status: string; requested_at: string }[] }>('/trips/my-requests');
    return res.data;
  },
};

export const expenses = {
  list: async (tripId: number) => {
    const res = await api.get<{ expenses: Expense[] }>(`/trips/${tripId}/expenses`);
    return res.data;
  },

  create: async (
    tripId: number,
    data: {
      amount: number;
      description: string;
      category?: ExpenseCategory;
      paid_by?: number;
      split_type: 'equally' | 'shares' | 'percentage' | 'exact';
      split_data: { user_id: number; share_count?: number; percentage?: number; amount?: number }[];
      expense_date?: string;
      currency?: string;
      receipt_url?: string;
    }
  ) => {
    const res = await api.post<{ message: string; expense: Expense }>(`/trips/${tripId}/expenses`, data);
    return res.data;
  },

  get: async (tripId: number, expenseId: number) => {
    const res = await api.get<{ expense: Expense }>(`/trips/${tripId}/expenses/${expenseId}`);
    return res.data;
  },

  delete: async (tripId: number, expenseId: number) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}/expenses/${expenseId}`);
    return res.data;
  },

  update: async (
    tripId: number,
    expenseId: number,
    data: {
      amount?: number;
      description?: string;
      category?: ExpenseCategory;
      split_type?: 'equally' | 'shares' | 'percentage' | 'exact';
      split_data?: { user_id: number; share_count?: number; percentage?: number; amount?: number }[];
      expense_date?: string;
      receipt_url?: string;
    }
  ) => {
    const res = await api.put<{ message: string; expense: Expense }>(
      `/trips/${tripId}/expenses/${expenseId}`,
      data
    );
    return res.data;
  },

  getBudget: async (tripId: number) => {
    const res = await api.get<{ budget: Budget }>(`/trips/${tripId}/budget`);
    return res.data;
  },

  getSettlement: async (tripId: number) => {
    const res = await api.get<SettlementData>(`/trips/${tripId}/settlement`);
    return res.data;
  },

  getPersonalSettlement: async (tripId: number, userId: number) => {
    const res = await api.get<PersonalSettlementData>(`/trips/${tripId}/settlement/${userId}`);
    return res.data;
  },

  getByDate: async (tripId: number) => {
    const res = await api.get<{
      expenses_by_date: ExpensesByDate[];
      trip_start: string | null;
      trip_end: string | null;
    }>(`/trips/${tripId}/expenses/by-date`);
    return res.data;
  },

  getBudgetByDate: async (tripId: number) => {
    const res = await api.get<{
      budget_by_date: BudgetByDate[];
      overall_total: number;
      overall_per_person: number;
      member_count: number;
      trip_start: string | null;
      trip_end: string | null;
    }>(`/trips/${tripId}/budget/by-date`);
    return res.data;
  },

  settle: async (tripId: number, data: { amount: number; from_user_id: number; to_user_id: number; date?: string }) => {
    const res = await api.post<{ message: string; expense: Expense }>(`/trips/${tripId}/settle`, data);
    return res.data;
  },

  getComments: async (expenseId: number) => {
    const res = await api.get<{ comments: any[] }>(`/expenses/${expenseId}/comments`);
    return res.data;
  },

  createComment: async (expenseId: number, content: string) => {
    const res = await api.post<{ message: string; comment: any }>(`/expenses/${expenseId}/comments`, { content });
    return res.data;
  },

  getActivities: async (expenseId: number) => {
    const res = await api.get<{ activities: any[] }>(`/expenses/${expenseId}/activities`);
    return res.data;
  },
};

export const options = {
  list: async (tripId: number, sort?: 'created_at' | 'price' | 'votes') => {
    const params = sort ? { sort } : {};
    const res = await api.get<{ options: StayOption[] }>(`/trips/${tripId}/options`, { params });
    return res.data;
  },

  create: async (
    tripId: number,
    data: {
      title: string;
      link: string;
      price: number;
      notes?: string;
      check_in_date?: string;
      check_out_date?: string;
      category?: OptionCategory;
    }
  ) => {
    const res = await api.post<{ message: string; option: StayOption }>(`/trips/${tripId}/options`, data);
    return res.data;
  },

  update: async (
    optionId: number,
    data: Partial<{
      title: string;
      link: string;
      price: number;
      notes: string;
      check_in_date: string;
      check_out_date: string;
      category: OptionCategory;
    }>
  ) => {
    const res = await api.put<{ message: string; option: StayOption }>(`/options/${optionId}`, data);
    return res.data;
  },

  delete: async (optionId: number) => {
    const res = await api.delete<{ message: string }>(`/options/${optionId}`);
    return res.data;
  },

  getRanked: async (tripId: number) => {
    const res = await api.get<{ ranked_options: RankedOption[] }>(`/trips/${tripId}/options/ranked`);
    return res.data;
  },

  uploadImage: async (optionId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post<{ message: string; option: StayOption }>(
      `/options/${optionId}/image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  deleteImage: async (optionId: number) => {
    const res = await api.delete<{ message: string; option: StayOption }>(`/options/${optionId}/image`);
    return res.data;
  },

  finalize: async (optionId: number) => {
    const res = await api.post<{ message: string; option: StayOption }>(`/options/${optionId}/finalize`);
    return res.data;
  },

  unfinalize: async (optionId: number) => {
    const res = await api.post<{ message: string; option: StayOption }>(`/options/${optionId}/unfinalize`);
    return res.data;
  },

  getByDate: async (tripId: number) => {
    const res = await api.get<{
      options_by_date: OptionsByDate[];
      trip_start: string | null;
      trip_end: string | null;
    }>(`/trips/${tripId}/options/by-date`);
    return res.data;
  },

  extract: async (url: string) => {
    const res = await api.post<{ image_url: string; link_title: string; link_description: string }>('/options/extract', { url });
    return res.data;
  },
};

export const votes = {
  cast: async (optionId: number, score: number = 1) => {
    const res = await api.post<{ message: string; vote: Vote }>(`/options/${optionId}/vote`, { score });
    return res.data;
  },
};
