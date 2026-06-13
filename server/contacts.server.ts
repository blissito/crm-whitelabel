import { db } from "~/lib/db.server";
import { parseJson, serialize } from "~/lib/json";

// ─── Shapes que consume la UI / API (planos, ya hidratados) ──────────────
export type ContactItem = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  customFields: Record<string, unknown>;
  direcciones: unknown[];
  conversationId: string | null;
  capturedAt: string;
};

export type ContactInput = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  profilePictureUrl?: string | null;
  customFields?: Record<string, unknown>;
  direcciones?: unknown[];
  conversationId?: string | null;
};

type ContactRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  customFields: string | null;
  direcciones: string | null;
  conversationId: string | null;
  capturedAt: Date;
};

function toContactItem(c: ContactRow): ContactItem {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    profilePictureUrl: c.profilePictureUrl,
    customFields: parseJson<Record<string, unknown>>(c.customFields, {}),
    direcciones: parseJson<unknown[]>(c.direcciones, []),
    conversationId: c.conversationId,
    capturedAt: c.capturedAt.toISOString(),
  };
}

export async function listContacts(
  workspaceId: string,
  opts: { search?: string; limit?: number } = {}
): Promise<ContactItem[]> {
  const search = opts.search?.trim();
  const rows = await db.contact.findMany({
    where: {
      workspaceId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { capturedAt: "desc" },
    take: opts.limit ?? 200,
  });
  return rows.map(toContactItem);
}

/** Crea un contacto. Si trae `phone`, es idempotente por la única compuesta
 *  [workspaceId, phone] (upsert): repetir el mismo teléfono actualiza. */
export async function createContact(
  workspaceId: string,
  input: ContactInput
): Promise<ContactItem> {
  const data = {
    name: input.name ?? null,
    email: input.email ?? null,
    profilePictureUrl: input.profilePictureUrl ?? null,
    conversationId: input.conversationId ?? null,
    ...(input.customFields !== undefined && {
      customFields: serialize(input.customFields),
    }),
    ...(input.direcciones !== undefined && {
      direcciones: serialize(input.direcciones),
    }),
  };

  const phone = input.phone?.trim() || null;
  if (phone) {
    const row = await db.contact.upsert({
      where: { workspaceId_phone: { workspaceId, phone } },
      create: { workspaceId, phone, ...data },
      update: data,
    });
    return toContactItem(row);
  }
  const row = await db.contact.create({
    data: { workspaceId, phone: null, ...data },
  });
  return toContactItem(row);
}

export async function updateContact(
  workspaceId: string,
  contactId: string,
  input: ContactInput
): Promise<ContactItem> {
  const existing = await db.contact.findFirst({
    where: { id: contactId, workspaceId },
    select: { id: true },
  });
  if (!existing) throw new Error("Contacto no encontrado");

  const row = await db.contact.update({
    where: { id: contactId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.profilePictureUrl !== undefined && {
        profilePictureUrl: input.profilePictureUrl,
      }),
      ...(input.conversationId !== undefined && {
        conversationId: input.conversationId,
      }),
      ...(input.customFields !== undefined && {
        customFields: serialize(input.customFields),
      }),
      ...(input.direcciones !== undefined && {
        direcciones: serialize(input.direcciones),
      }),
    },
  });
  return toContactItem(row);
}
