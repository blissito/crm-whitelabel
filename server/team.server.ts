import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "~/lib/db.server";
import { generateApiKey } from "server/auth.server";
import { UserRole } from "~/lib/enums";

const INVITE_TTL_HOURS = 24 * 7; // 7 días

export async function listMembers(workspaceId: string) {
  return db.user.findMany({
    where: { workspaceId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listPendingInvites(workspaceId: string) {
  const invites = await db.invitation.findMany({
    where: { workspaceId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const now = Date.now();
  const live = invites.filter((i) => !i.expiresAt || i.expiresAt.getTime() > now);

  // Descarta invitaciones cuyo correo ya tiene cuenta: están muertas
  // (acceptInvitation fallaría con "ya existe una cuenta") y sólo confunden.
  const emails = live
    .map((i) => i.email?.toLowerCase())
    .filter((e): e is string => !!e);
  const taken = emails.length
    ? new Set(
        (
          await db.user.findMany({
            where: { email: { in: emails } },
            select: { email: true },
          })
        ).map((u) => u.email.toLowerCase())
      )
    : new Set<string>();

  return live.filter((i) => !i.email || !taken.has(i.email.toLowerCase()));
}

export async function createInvitation(
  workspaceId: string,
  opts: { role?: string; email?: string; invitedByEmail?: string }
): Promise<string> {
  const token = `inv_${randomBytes(18).toString("hex")}`;
  await db.invitation.create({
    data: {
      token,
      workspaceId,
      role: opts.role ?? UserRole.MEMBER,
      email: opts.email ?? null,
      invitedByEmail: opts.invitedByEmail ?? null,
      expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000),
    },
  });
  return token;
}

export async function revokeInvitation(workspaceId: string, id: string) {
  await db.invitation.deleteMany({ where: { id, workspaceId } });
}

/** Cambia el rol de un miembro del tablero. Sólo entre ADMIN y MEMBER; nunca
 *  toca al OWNER. Scopeado al workspace para que un admin no afecte otros. */
export async function setMemberRole(
  workspaceId: string,
  userId: string,
  role: "ADMIN" | "MEMBER"
) {
  if (role !== UserRole.ADMIN && role !== UserRole.MEMBER) {
    throw new Error("Rol inválido");
  }
  const member = await db.user.findFirst({
    where: { id: userId, workspaceId },
    select: { id: true, role: true },
  });
  if (!member) throw new Error("Miembro no encontrado");
  if (member.role === UserRole.OWNER) throw new Error("No se puede cambiar el rol del dueño");
  await db.user.update({ where: { id: member.id }, data: { role } });
}

type InviteInfo = {
  workspaceId: string;
  workspaceName: string;
  role: string;
  email: string | null;
};

export async function resolveInvitation(token: string): Promise<InviteInfo | null> {
  const inv = await db.invitation.findUnique({ where: { token } });
  if (!inv || inv.acceptedAt) return null;
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) return null;
  const ws = await db.workspace.findUnique({
    where: { id: inv.workspaceId },
    select: { name: true },
  });
  if (!ws) return null;
  return { workspaceId: inv.workspaceId, workspaceName: ws.name, role: inv.role, email: inv.email };
}

/** Acepta la invitación: crea el seat (user) en el workspace y la consume. */
export async function acceptInvitation(
  token: string,
  data: { name?: string; email: string; password: string }
) {
  const inv = await db.invitation.findUnique({ where: { token } });
  if (!inv || inv.acceptedAt) throw new Error("Invitación inválida o ya usada");
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) {
    throw new Error("La invitación expiró");
  }
  const email = data.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("Ya existe una cuenta con ese correo");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await db.user.create({
    data: {
      email,
      name: data.name?.trim() || null,
      passwordHash,
      role: inv.role,
      workspaceId: inv.workspaceId,
      apiKey: generateApiKey(),
    },
  });
  await db.invitation.update({
    where: { id: inv.id },
    data: { acceptedAt: new Date() },
  });
  return user;
}
