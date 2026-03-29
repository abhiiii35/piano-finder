export const ROLES = {
  CUSTOMER: "CUSTOMER",
  TECHNICIAN: "TECHNICIAN",
  ADMIN: "ADMIN",
} as const;

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export const JOB_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

export const SERVICE_TYPES = [
  "Tuning",
  "Repair",
  "Regulation",
  "Voicing",
  "Appraisal",
  "Humidity System",
] as const;

export const PIANO_TYPES = [
  "Grand",
  "Upright",
  "Baby Grand",
  "Digital",
  "Player",
] as const;
