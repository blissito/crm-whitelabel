import { useFetcher } from "react-router";
import type { Route } from "./+types/admin._index";
import { requireSuperAdmin } from "server/auth.server";
import { listWorkspacesOverview, deleteWorkspaceById } from "server/admin.server";
import { HiTrash } from "react-icons/hi2";

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  return { workspaces: await listWorkspacesOverview() };
}

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);
  const form = await request.formData();
  if (form.get("intent") === "delete") {
    await deleteWorkspaceById(String(form.get("id")));
  }
  return { ok: true };
}

export default function AdminTableros({ loaderData }: Route.ComponentProps) {
  const { workspaces } = loaderData;
  const fetcher = useFetcher();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-dark">
        Tableros <span className="text-gray-400">({workspaces.length})</span>
      </h1>
      <div className="overflow-x-auto rounded-2xl border border-outlines bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-outlines text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Tablero</th>
              <th className="px-4 py-3 font-medium">Usuarios</th>
              <th className="px-4 py-3 font-medium">Deals</th>
              <th className="px-4 py-3 font-medium">Convs</th>
              <th className="px-4 py-3 font-medium">Llave</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outlines">
            {workspaces.map((w) => (
              <tr key={w.id} className="hover:bg-surface/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-dark">{w.name}</div>
                  <div className="text-xs text-gray-400">{w.slug}</div>
                </td>
                <td className="px-4 py-3">{w.users}</td>
                <td className="px-4 py-3">{w.deals}</td>
                <td className="px-4 py-3">{w.conversations}</td>
                <td className="px-4 py-3">
                  <code className="text-xs text-gray-400">
                    {w.apiKey ? `${w.apiKey.slice(0, 14)}…` : "—"}
                  </code>
                </td>
                <td className="px-4 py-3 text-right">
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      title="Borrar tablero"
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
