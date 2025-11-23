import { type RequirementStatus } from '@/services/api/api.ts';

export const REQUIREMENT_STATUS = [
  'Nicht gesetzt',
  'Nicht erfüllt',
  'Teilweise erfüllt',
  'Erfüllt'
];

// noinspection JSNonASCIINames
export const STATUS_STYLE_MAP: Record<RequirementStatus | 'Nicht gesetzt', { bg: string; text: string }> = {
  'Erfüllt': { bg: 'bg-green-100', text: 'text-green-800' },
  'Teilweise erfüllt': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'Nicht erfüllt': { bg: 'bg-red-100', text: 'text-red-800' },
  'Nicht gesetzt': { bg: 'bg-gray-100', text: 'text-gray-800' }
} as const;