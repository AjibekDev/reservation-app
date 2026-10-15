import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import type { BookingInput, BookingPatch } from '../api/types';

export const bookingsKeys = {
  all: ['bookings'] as const,
  byDate: (date: string) => [...bookingsKeys.all, date] as const,
};

export const useBookings = (date: string) =>
  useQuery({
    queryKey: bookingsKeys.byDate(date),
    queryFn: () => bookingsApi.getByDate(date),
  });

const useInvalidateBookings = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: bookingsKeys.all });
};

export const useCreateBooking = () => {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: BookingInput) => bookingsApi.create(input),
    onSettled: invalidate,
  });
};

export const useUpdateBooking = () => {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BookingPatch }) =>
      bookingsApi.update(id, patch),
    onSettled: invalidate,
  });
};

export const useDeleteBooking = () => {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (id: string) => bookingsApi.remove(id),
    onSettled: invalidate,
  });
};
