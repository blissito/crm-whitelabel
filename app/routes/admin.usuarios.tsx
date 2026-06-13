import { useFetcher } from "react-router";
import type { Route } from "./+types/admin.usuarios";
import { requireSuperAdmin } from "server/auth.server";
import { listAllUsers, deleteUserById } from "server/admin.server";
import { HiTrash } from "react-icons/hi2";

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  return { users: await listAllUsers() };
}

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);
  const form = await request.formData();
  if (form.get("intent") === "delete") {
    await deleteUserById(String(form.get("id")));
  }
  return { ok: true };
}

export default function AdminUsuarios({ loaderData }: Route.ComponentProps) {
  const { users } = loaderData;
  const fetcher = useFetcher();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-dark">
        Usuarios <span className="text-gray-400">({users.length})</span>
      </h1>
      <div className="overflow-x-auto rounded-2xl border border-outlines bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-outlines text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Tablero</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outlines">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-dark">{u.name ?? u.email}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.workspace?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-gray-500">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={u.id} />
                    <button
                      type="submit"
                      title="Borrar usuario"
                      className="rounded-md p-1.5 text-gray-300 hover:bg-danger/10 hover:text-danger"
                    >
                      <HiTrash className="h-4 w-4" />
                    </button>
                  </fetcher.Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
