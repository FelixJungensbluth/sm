import type { TenderStatus } from "@/services/api/api";
import type { TaskStatus } from "../lib/types";

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

// Keep TaskStatus versions for backward compatibility
export const taskStatusLabels: Record<TaskStatus, string> = statusLabels;
export const taskStatusBoardColors: Record<TaskStatus, string> = statusBoardColors;
