import type { TenderStatus } from "@/lib/types";

export const statusLabels: Record<TenderStatus, string> = {
  "In Prüfung": "In Prüfung",
  "In Ausarbeitung": "In Ausarbeitung",
  "Uninteressant": "Uninteressant",
  "Abgeschickt": "Abgeschickt",
  "Abgelehnt": "Abgelehnt",
};

export const statusBoardColors: Record<TenderStatus, string> = {
  "In Prüfung": "--warning",
  "In Ausarbeitung": "--info",
  "Uninteressant": "--neutral-foreground",
  "Abgeschickt": "--success",
  "Abgelehnt": "--destructive",
};