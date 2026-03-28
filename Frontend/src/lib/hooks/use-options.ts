import useSWR from 'swr';
import { options } from '@/lib/api/endpoints';
import type { StayOption, RankedOption } from '@/types';

const EMPTY_ARRAY: any[] = [];

export function useOptions(tripId: string | null, sort?: 'created_at' | 'price' | 'votes') {
  const { data, error, isLoading, mutate } = useSWR<{ options: StayOption[] }>(
    tripId ? `/trips/${tripId}/options?sort=${sort || 'created_at'}` : null,
    () => options.list(tripId!, sort)
  );

  return {
    options: data?.options ?? (EMPTY_ARRAY as StayOption[]),
    isLoading,
    isError: error,
    mutate,
  };
}

export function useRankedOptions(tripId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ ranked_options: RankedOption[] }>(
    tripId ? `/trips/${tripId}/options/ranked` : null,
    () => options.getRanked(tripId!)
  );

  return {
    rankedOptions: data?.ranked_options ?? (EMPTY_ARRAY as RankedOption[]),
    isLoading,
    isError: error,
    mutate,
  };
}
