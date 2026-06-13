import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineLink,
  HiOutlineShare,
  HiCheck,
  HiClipboard,
  HiArrowTopRightOnSquare,
  HiXMark,
} from "react-icons/hi2";
import { cn } from "~/lib/cn";
import { createShareLink } from "~/lib/queries/pipeline";
import { useEscapeKey } from "~/lib/useEscapeKey";

/** Botón "Compartir" que genera un link público read-only (tablero o lead) y
 *  muestra un modal con la URL para copiar/abrir. */
export function ShareButton({
  kind,
  dealId,
  label = "Compartir",
  className,
}: {
  kind: "pipeline" | "deal";
  dealId?: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    const link = await createShareLink({ kind, dealId });
    setLoading(false);
    if (link) setUrl(link);
  };

  const copy = () => {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const close = () => {
    setUrl(null);
    setCopied(false);
  };

  useEscapeKey(close, url !== null);

  return (
    <>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        title={kind === "deal" ? "Compartir esta oportunidad" : "Compartir el tablero"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-outlines px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface disabled:opacity-50",
          className
        )}
      >
        <HiOutlineShare className="h-4 w-4" />
        {loading ? "Generando…" : label}
      </button>

      <AnimatePresence>
        {url && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/40"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <button
                onClick={close}
                className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-dark"
                aria-label="Cerrar"
              >
                <HiXMark className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 text-brand-500">
                <HiOutlineLink className="h-5 w-5" />
                <h3 className="text-base font-semibold text-dark">
                  Link público {kind === "deal" ? "de la oportunidad" : "del tablero"}
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Cualquiera con este link podrá verlo en{" "}
                <span className="font-medium text-gray-600">solo lectura</span>. Apágalo
                cuando quieras desde Mi cuenta.
              </p>

              <div className="mt-4 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-dark px-3 py-2.5 font-mono text-xs text-white">
                  {url}
                </code>
                <button
                  onClick={copy}
                  title="Copiar"
                  className="rounded-lg border border-outlines p-2.5 text-gray-500 transition hover:bg-surface"
                >
                  {copied ? (
                    <HiCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <HiClipboard className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-surface"
                >
                  <HiArrowTopRightOnSquare className="h-4 w-4" />
                  Abrir
                </a>
                <button
                  onClick={close}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
