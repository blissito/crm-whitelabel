import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge de clases Tailwind con dedupe. Usado por componentes portados. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
