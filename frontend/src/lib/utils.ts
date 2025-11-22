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