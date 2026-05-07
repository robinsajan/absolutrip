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
  PollOptionType,
  PollVote,
  Document,
  Poll,
} from '@/types';

export const auth = {
  register: async (data: { email: string; password: string; name: string }) => {
    const res = await api.post<{ message: string; user: User }>('/auth/register', data);
    return res.data;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await api.post<{ message: string; user: User; token: string }>('/auth/login', data);
    return res.data;
  },

  logout: async () => {
    const res = await api.post<{ message: string }>('/auth/logout');
    return res.data;
  },

  verify: async (token: string) => {
    const res = await api.get<{ message: string }>(`/auth/verify/${token}`);
    return res.data;
  },

  me: async () => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data;
  },
  resendVerification: async (email: string) => {
    const res = await api.post<{ message: string }>('/auth/resend-verification', { email });
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (data: { token: string; password: string }) => {
    const res = await api.post<{ message: string }>('/auth/reset-password', data);
    return res.data;
  },
  updateTour: async (show_budget_tour: boolean) => {
    const res = await api.post<{ message: string; user: User }>('/auth/update-tour', { show_budget_tour });
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

  get: async (tripId: string) => {
    const res = await api.get<{ trip: Trip }>(`/trips/${tripId}`);
    return res.data;
  },

  update: async (tripId: string, data: Partial<{ name: string; start_date: string; end_date: string; google_maps_url: string }>) => {
    const res = await api.put<{ message: string; trip: Trip }>(`/trips/${tripId}`, data);
    return res.data;
  },

  delete: async (tripId: string) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}`);
    return res.data;
  },

  join: async (inviteCode: string) => {
    const res = await api.post<{ message: string; trip?: Trip; status: string }>(`/trips/join/${inviteCode}`);
    return res.data;
  },

  getMembers: async (tripId: string) => {
    const res = await api.get<{ members: TripMember[] }>(`/trips/${tripId}/members`);
    return res.data;
  },

  removeMember: async (tripId: string, userId: number) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}/members/${userId}`);
    return res.data;
  },

  getJoinRequests: async (tripId: string) => {
    const res = await api.get<{ requests: JoinRequest[] }>(`/trips/${tripId}/join-requests`);
    return res.data;
  },

  approveJoinRequest: async (tripId: string, requestId: number) => {
    const res = await api.post<{ message: string; member: TripMember }>(
      `/trips/${tripId}/join-requests/${requestId}/approve`
    );
    return res.data;
  },

  rejectJoinRequest: async (tripId: string, requestId: number) => {
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
  list: async (tripId: string) => {
    const res = await api.get<{ expenses: Expense[] }>(`/trips/${tripId}/expenses`);
    return res.data;
  },

  create: async (
    tripId: string,
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

  get: async (tripId: string, expenseId: number) => {
    const res = await api.get<{ expense: Expense }>(`/trips/${tripId}/expenses/${expenseId}`);
    return res.data;
  },

  delete: async (tripId: string, expenseId: number) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}/expenses/${expenseId}`);
    return res.data;
  },

  update: async (
    tripId: string,
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

  getBudget: async (tripId: string) => {
    const res = await api.get<{ budget: Budget }>(`/trips/${tripId}/budget`);
    return res.data;
  },

  getSettlement: async (tripId: string) => {
    const res = await api.get<SettlementData>(`/trips/${tripId}/settlement`);
    return res.data;
  },

  getPersonalSettlement: async (tripId: string, userId: number) => {
    const res = await api.get<PersonalSettlementData>(`/trips/${tripId}/settlement/${userId}`);
    return res.data;
  },

  getByDate: async (tripId: string) => {
    const res = await api.get<{
      expenses_by_date: ExpensesByDate[];
      trip_start: string | null;
      trip_end: string | null;
    }>(`/trips/${tripId}/expenses/by-date`);
    return res.data;
  },

  getBudgetByDate: async (tripId: string) => {
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

  settle: async (tripId: string, data: { amount: number; from_user_id: number; to_user_id: number; date?: string }) => {
    const res = await api.post<{ message: string; expense: Expense }>(`/trips/${tripId}/settle`, data);
    return res.data;
  },

  getComments: async (tripId: string, expenseId: number) => {
    const res = await api.get<any[]>(`/trips/${tripId}/expenses/${expenseId}/comments`);
    return res.data;
  },

  createComment: async (tripId: string, expenseId: number, content: string) => {
    const res = await api.post<any>(`/trips/${tripId}/expenses/${expenseId}/comments`, { content });
    return res.data;
  },

  getActivities: async (tripId: string, expenseId: number) => {
    const res = await api.get<any[]>(`/trips/${tripId}/expenses/${expenseId}/activities`);
    return res.data;
  },
};

export const options = {
  list: async (tripId: string, sort?: 'created_at' | 'price' | 'votes') => {
    const params = sort ? { sort } : {};
    const res = await api.get<{ options: StayOption[] }>(`/trips/${tripId}/options`, { params });
    return res.data;
  },

  create: async (
    tripId: string,
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

  getRanked: async (tripId: string) => {
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

  getByDate: async (tripId: string) => {
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

export const announcements = {
  list: async (tripId: string) => {
    const res = await api.get<{ announcements: any[] }>(`/trips/${tripId}/announcements`);
    return res.data;
  },

  create: async (tripId: string, content: string) => {
    const res = await api.post<{ message: string; announcement: any }>(`/trips/${tripId}/announcements`, { content });
    return res.data;
  },

  update: async (tripId: string, announcementId: number, content: string) => {
    const res = await api.put<{ message: string; announcement: any }>(`/trips/${tripId}/announcements/${announcementId}`, { content });
    return res.data;
  },

  delete: async (tripId: string, announcementId: number) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}/announcements/${announcementId}`);
    return res.data;
  },

  react: async (tripId: string, announcementId: number, type: 'like' | 'dislike') => {
    const res = await api.post<{ message: string; announcement: any }>(`/trips/${tripId}/announcements/${announcementId}/react`, { type });
    return res.data;
  },
};

export const notifications = {
  list: async () => {
    const res = await api.get<{ notifications: any[]; unread_count: number }>('/notifications');
    return res.data;
  },
  markAsRead: async (id: number) => {
    const res = await api.put<{ message: string }>(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.post<{ message: string }>('/notifications/read-all');
    return res.data;
  },
};

export const polls = {
  list: async (tripId: string) => {
    const res = await api.get<{ polls: Poll[] }>(`/trips/${tripId}/polls`);
    return res.data;
  },

  create: async (tripId: string, data: { question: string; options: string[]; allow_multiple: boolean }) => {
    const res = await api.post<{ message: string; poll: Poll }>(`/trips/${tripId}/polls`, data);
    return res.data;
  },

  vote: async (pollId: number, optionIds: number[]) => {
    const res = await api.post<{ message: string; poll: Poll }>(`/polls/${pollId}/vote`, { option_ids: optionIds });
    return res.data;
  },

  delete: async (pollId: number) => {
    const res = await api.delete<{ message: string }>(`/polls/${pollId}`);
    return res.data;
  },
};

export const documents = {
  list: async (tripId: string, params?: { start_date?: string; end_date?: string; tag?: string }) => {
    const res = await api.get<{ documents: Document[] }>(`/trips/${tripId}/documents`, { params });
    return res.data;
  },

  upload: async (tripId: string, data: { files: File[]; title?: string; tags?: string }) => {
    const formData = new FormData();
    data.files.forEach((file) => {
      formData.append('files', file);
    });
    if (data.title) formData.append('title', data.title);
    if (data.tags) formData.append('tags', data.tags);

    const res = await api.post<{ message: string; document: Document }>(
      `/trips/${tripId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  delete: async (docId: number) => {
    const res = await api.delete<{ message: string }>(`/documents/${docId}`);
    return res.data;
  },

  getTags: async (tripId: string) => {
    const res = await api.get<{ tags: string[] }>(`/trips/${tripId}/documents/tags`);
    return res.data;
  },
};
