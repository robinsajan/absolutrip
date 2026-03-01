import useSWR from 'swr';
import { options } from '@/lib/api/endpoints';
import type { StayOption, RankedOption } from '@/types';

export function useOptions(tripId: number | null, sort?: 'created_at' | 'price' | 'votes') {
  const { data, error, isLoading, mutate } = useSWR<{ options: StayOption[] }>(
    tripId ? `/trips/${tripId}/options?sort=${sort || 'created_at'}` : null,
    () => options.list(tripId!, sort)
  );

  return {
    options: data?.options ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useRankedOptions(tripId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<{ ranked_options: RankedOption[] }>(
    tripId ? `/trips/${tripId}/options/ranked` : null,
    () => options.getRanked(tripId!)
  );

  return {
    rankedOptions: data?.ranked_options ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
