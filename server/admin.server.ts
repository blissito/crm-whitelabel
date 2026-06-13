import { randomBytes } from "crypto";
import { db } from "~/lib/db.server";
import { generateApiKey } from "server/auth.server";
import { createInvitation } from "server/team.server";
import { defaultWorkspaceData, seedDemoDeals } from "server/workspace-defaults";
import { UserRole } from "~/lib/enums";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "tablero"
  );
}

/** Provisiona un tablero NUEVO listo para entregar: crea el Workspace con su
 *  llave de API (la que el admin conecta en el agente), lo siembra con deals
 *  demo y deja una invitación OWNER pendiente. Cuando el invitado acepta el
 *  correo, entra como dueño a ESTE tablero — la llave ya quedó cableada. */
export async function provisionTablero(opts: {
  name: string;
  email: string;
  invitedByEmail?: string;
}): Promise<{ workspaceId: string; name: string; apiKey: string; inviteToken: string }> {
  const name = opts.name.trim();
  const email = opts.email.trim().toLowerCase();
  if (!name) throw new Error("El nombre del tablero es requerido");
  if (!email) throw new Error("El correo del invitado es requerido");

  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) throw new Error("Ya existe una cuenta con ese correo");

  const apiKey = generateApiKey();
  const slug = `${slugify(name)}-${randomBytes(3).toString("hex")}`;

  const workspace = await db.workspace.create({
    data: defaultWorkspaceData({ slug, name, apiKey }),
  });
  await seedDemoDeals(db, workspace.id);

  const inviteToken = await createInvitation(workspace.id, {
    role: UserRole.OWNER,
    email,
    invitedByEmail: opts.invitedByEmail,
  });

  return { workspaceId: workspace.id, name, apiKey, inviteToken };
}

/** Overview de todos los tableros (super-admin). */
export async function listWorkspacesOverview() {
  const workspaces = await db.workspace.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slug: true, apiKey: true, createdAt: true },
  });
  return Promise.all(
    workspaces.map(async (w) => {
      const [users, deals, conversations] = await Promise.all([
        db.user.count({ where: { workspaceId: w.id } }),
        db.deal.count({ where: { workspaceId: w.id } }),
        db.conversation.count({ where: { workspaceId: w.id } }),
      ]);
      return { ...w, users, deals, conversations };
    })
  );
}

export function listAllUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      workspace: { select: { name: true } },
    },
  });
}

export async function deleteWorkspaceById(id: string) {
  await db.workspace.delete({ where: { id } });
}

export async function deleteUserById(id: string) {
  await db.user.delete({ where: { id } });
}
