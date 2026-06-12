// Único punto donde las columnas JSON-as-String se hidratan al shape que la UI
// espera (arrays/objetos). Toda lectura/escritura de tags, estado, pipeline,
// presets, etc. pasa por aquí.

export type ConvoTag = {
  label: string;
  color: string;
  comment?: string;
  createdAt?: string;
  createdBy?: string;
};

export type ConvoEstado = {
  label: string;
  color: string;
  setAt?: string;
  setBy?: string;
};

export type PipelineStage = {
  id: string;
  name: string;
  color: string;
  order: number;
  isClosed?: boolean;
  closedType?: "won" | "lost";
};

export type Preset = { label: string; color: string };

export type Branding = {
  logoUrl?: string;
  primaryColor?: string;
  name?: string;
};

/** Parse genérico tolerante: devuelve `fallback` si el String es null/inválido. */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const serialize = (value: unknown): string => JSON.stringify(value);

export const parseTags = (value: string | null | undefined): ConvoTag[] =>
  parseJson<ConvoTag[]>(value, []);

export const parseEstado = (
  value: string | null | undefined
): ConvoEstado | null => parseJson<ConvoEstado | null>(value, null);

export const parsePipeline = (
  value: string | null | undefined
): PipelineStage[] => parseJson<PipelineStage[]>(value, []);

export const parsePresets = (value: string | null | undefined): Preset[] =>
  parseJson<Preset[]>(value, []);

export const parseStringArray = (value: string | null | undefined): string[] =>
  parseJson<string[]>(value, []);

export const parseBranding = (
  value: string | null | undefined
): Branding | null => parseJson<Branding | null>(value, null);
