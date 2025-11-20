import type { TenderStatus, Tender } from "@/services/api/api";

export enum ThemeMode {
  LIGHT = "LIGHT",
  DARK = "DARK",
  SYSTEM = "SYSTEM",
}

// Re-export Tender types for convenience
export type { Tender, TenderStatus, BaseInformation } from "@/services/api/api";
export type TenderWithAttemptStatus = Tender;

export const TENDER_STATUSES: TenderStatus[] = [
  'In Prüfung',
  'In Ausarbeitung',
  'Uninteressant',
  'Abgeschickt',
  'Abgelehnt',
];