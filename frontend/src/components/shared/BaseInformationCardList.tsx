import type { ExtractedData } from "@/services/api/api";
import { Info, Calendar, Tag, Building, MapPin, DollarSign, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseInformationCardListProps {
  baseInformation: ExtractedData[];
  excludeFields?: string[];
  className?: string;
}

// Map field names to appropriate icons
const getIconForField = (fieldName: string) => {
  const lowerFieldName = fieldName.toLowerCase();
  
  if (lowerFieldName.includes("deadline") || lowerFieldName.includes("date") || lowerFieldName.includes("zeit")) {
    return Calendar;
  }
  if (lowerFieldName.includes("type") || lowerFieldName.includes("typ")) {
    return Tag;
  }
  if (lowerFieldName.includes("location") || lowerFieldName.includes("ort") || lowerFieldName.includes("standort")) {
    return MapPin;
  }
  if (lowerFieldName.includes("budget") || lowerFieldName.includes("preis") || lowerFieldName.includes("kosten")) {
    return DollarSign;
  }
  if (lowerFieldName.includes("company") || lowerFieldName.includes("firma") || lowerFieldName.includes("unternehmen")) {
    return Building;
  }
  if (lowerFieldName.includes("contact") || lowerFieldName.includes("kontakt") || lowerFieldName.includes("person")) {
    return User;
  }
  if (lowerFieldName.includes("document") || lowerFieldName.includes("dokument") || lowerFieldName.includes("file")) {
    return FileText;
  }
  
  return Info;
};

export function BaseInformationCardList({
  baseInformation,
  excludeFields = ["compact_description"],
  className,
}: BaseInformationCardListProps) {
  const getAllFields = () => {
    return baseInformation.filter(
      (info) => !excludeFields.includes(info.field_name || "") && info.value
    );
  };

  const fields = getAllFields();

  if (fields.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic p-3 border border-dashed text-center", className)}>
        No base information available.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {fields.map((info, index) => {
        const Icon = getIconForField(info.field_name);
        return (
          <div
            key={index}
            className="flex items-start gap-1.5 text-xs text-secondary-foreground"
          >
            <Icon className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span className="break-words flex-1 min-w-0">
              <span className="font-medium">{info.field_name}:</span>{' '}
              {info.value || '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
