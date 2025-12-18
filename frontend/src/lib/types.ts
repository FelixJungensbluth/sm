import type { TenderReviewStatus, Tender, ExtractedData } from "@/services/api/api";

export enum ThemeMode {
  LIGHT = "LIGHT",
  DARK = "DARK",
  SYSTEM = "SYSTEM",
}

// Type alias for TenderReviewStatus
export type TenderStatus = TenderReviewStatus;

// Re-export Tender types for convenience
export type { Tender, ExtractedData };
export type TenderWithAttemptStatus = Tender;

export const TENDER_STATUSES: TenderStatus[] = [
  'In Prüfung',
  'In Ausarbeitung',
  'Abgeschickt',
  'Abgelehnt',
  'Uninteressant',
];