import useSWR from 'swr';
import { trips } from '@/lib/api/endpoints';
import type { Trip, TripMember } from '@/types';

export function useTrips() {
  const { data, error, isLoading, mutate } = useSWR<{ trips: Trip[] }>(
    '/trips',
    () => trips.list()
  );

  return {
    trips: data?.trips ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useTrip(tripId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<{ trip: Trip }>(
    tripId ? `/trips/${tripId}` : null,
    () => trips.get(tripId!)
  );

  return {
    trip: data?.trip,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useTripMembers(tripId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<{ members: TripMember[] }>(
    tripId ? `/trips/${tripId}/members` : null,
    () => trips.getMembers(tripId!)
  );

  return {
    members: data?.members ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
