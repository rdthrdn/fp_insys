import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Safe ID generator untuk menghindari hydration error
let idCounter = 0;
export function generateSafeId(prefix: string = 'id'): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}
