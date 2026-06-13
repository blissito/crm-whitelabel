import { db } from "~/lib/db.server";

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
