import { STATUS_STYLE_MAP } from '@/constants/requirement-status';
import type { RequirementStatus } from '@/services/api/api';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanMarkdownSnippets(text: string[]) {
  return text
    .filter((t) => t.length > 3)
    .map((t) => {
      return t.replace(/[\n\r]/g, ' ')
        .replace(/[*_`~#[\]]/g, '')
        .replace(/- /g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    })
    .filter((t) => t.length > 3);
}

export function normalizeText(text: string) {
  return text
    .replace(/[\s-]+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

export const getStatusClasses = (status: RequirementStatus | 'Nicht gesetzt') => {
  const styles = STATUS_STYLE_MAP[status] ?? { bg: 'bg-gray-100', text: 'text-gray-800' };
  return clsx(styles.bg, styles.text);
};