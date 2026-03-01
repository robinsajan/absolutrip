import useSWR from 'swr';
import { expenses } from '@/lib/api/endpoints';
import type { Expense, Budget, SettlementData } from '@/types';

export function useExpenses(tripId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<{ expenses: Expense[] }>(
    tripId ? `/trips/${tripId}/expenses` : null,
    () => expenses.list(tripId!)
  );

  return {
    expenses: data?.expenses ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useBudget(tripId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<{ budget: Budget }>(
    tripId ? `/trips/${tripId}/budget` : null,
    () => expenses.getBudget(tripId!)
  );

  return {
    budget: data?.budget,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useSettlement(tripId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<SettlementData>(
    tripId ? `/trips/${tripId}/settlement` : null,
    () => expenses.getSettlement(tripId!)
  );

  return {
    balances: data?.balances ?? [],
    settlements: data?.settlements ?? [],
    explanation: data?.explanation,
    isLoading,
    isError: error,
    mutate,
  };
}
