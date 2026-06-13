import { useQuery } from "@tanstack/react-query";

// Real-time del hilo de mensajes copiando el patrón de Formmy (TanStack Query +
// refetchInterval). Poll corto (3s) para que el chat se sienta "en vivo":
// mensajes entrantes del cliente (vía webhook → DB) y eco de respuestas del
// operador aparecen solos sin recargar.
export type MessageItem = {
  id: string;
  content: string;
  role: string;
  origin: string | null;
  mediaType: string | null;
  mediaMime: string | null;
  mediaFilename: string | null;
  mediaFileId: string | null;
  isReaction: boolean;
  reactionEmoji: string | null;
  createdAt: string;
};

const POLL_MS = 3_000;

const messagesKey = (conversationId: string) =>
  ["messages", conversationId] as const;

async function fetchMessages(conversationId: string): Promise<MessageItem[]> {
  const res = await fetch("/api/v1/crm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent: "list_messages", conversationId }),
  });
  if (!res.ok) throw new Error(`list_messages ${res.status}`);
  const data = await res.json();
  return data.ok ? (data.items as MessageItem[]) : [];
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });
}
