export type Booking = {
  id: string;
  date: string;
  start: string;
  end: string;
  title?: string;
};

export type BookingInput = Omit<Booking, 'id'>;

export type BookingPatch = Partial<BookingInput>;

export type ApiErrorCode = 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND' | 'UNKNOWN';

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};
