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
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-outlines bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-outlines px-5">
          <img src={logo} alt={workspaceName} className="h-8 w-auto object-contain" />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-100 text-brand-600"
                    : "text-gray-600 hover:bg-surface"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-outlines p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-dark">
              {user.name ?? user.email}
            </p>
            <p className="truncate text-xs text-gray-400">{user.email}</p>
          </div>
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface"
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
              Cerrar sesión
            </button>
          </Form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
