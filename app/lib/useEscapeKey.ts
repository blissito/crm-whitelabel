import { useEffect } from "react";

/** Llama a `onEscape` cuando se presiona Esc, mientras `active` sea true.
 *  Para cerrar modales/drawers con el teclado. */
export function useEscapeKey(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape, active]);
}
