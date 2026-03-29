import useSWR from 'swr';
import { auth } from '@/lib/api/endpoints';
import { useAppStore } from '@/lib/store';
import type { User } from '@/types';

export function useAuth() {
  const { user, setUser, reset } = useAppStore();

  const { data, error, isLoading, mutate } = useSWR<{ user: User }>(
    '/auth/me',
    () => auth.me(),
    {
      onSuccess: (data) => {
        setUser(data.user);
      },
      onError: () => {
        setUser(null);
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  );

  const login = async (email: string, password: string) => {
    const result = await auth.login({ email, password });
    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }
    setUser(result.user);
    await mutate({ user: result.user }, { revalidate: false });
    return result;
  };

  const register = async (email: string, password: string, name: string) => {
    const result = await auth.register({ email, password, name });
    return result;
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('auth_token');
      reset();
      await mutate(undefined, { revalidate: false });
    }
  };

  const updateTourStatus = async (show_budget_tour: boolean) => {
    const result = await auth.updateTour(show_budget_tour);
    setUser(result.user);
    await mutate({ user: result.user }, { revalidate: false });
    return result;
  };

  return {
    user: data?.user ?? user,
    isLoading,
    isError: error,
    isAuthenticated: !!data?.user,
    login,
    register,
    logout,
    updateTourStatus,
    mutate,
  };
};
