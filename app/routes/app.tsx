import { Form, NavLink, Outlet } from "react-router";
import type { Route } from "./+types/app";
import { getUserOrRedirect } from "server/auth.server";
import { db } from "~/lib/db.server";
import { parseBranding } from "~/lib/json";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineUsers,
  HiOutlineRectangleStack,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineArrowRightOnRectangle,
} from "react-icons/hi2";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUserOrRedirect(request);
  const workspace = await db.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { name: true, branding: true },
  });
  return {
    user: { email: user.email, name: user.name },
    workspaceName: workspace?.name ?? "CRM",
    branding: parseBranding(workspace?.branding),
  };
}

const NAV = [
  { to: "/app/conversaciones", label: "Conversaciones", Icon: HiOutlineChatBubbleLeftRight },
  { to: "/app/contactos", label: "Contactos", Icon: HiOutlineUsers },
  { to: "/app/pipeline", label: "Pipeline", Icon: HiOutlineRectangleStack },
  { to: "/app/escalaciones", label: "Escalaciones", Icon: HiOutlineArrowTopRightOnSquare },
];

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { user, workspaceName, branding } = loaderData;
  const logo = branding?.logoUrl ?? "/brand/coregrid-logo.png";

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar navy — marca CoreGrid (logo blanco visible) */}
      <aside className="flex w-60 flex-col bg-dark text-white">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-6">
          <img src={logo} alt={workspaceName} className="w-44 max-w-full object-contain" />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-500 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-white">
              {user.name ?? user.email}
            </p>
            <p className="truncate text-xs text-white/50">{user.email}</p>
          </div>
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
              Cerrar sesión
            </button>
          </Form>
        </div>
      </aside>

      {/* Main — min-w-0 permite que el board interno haga scroll horizontal
          en vez de expandir el layout (trampa flexbox). */}
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
