import { Outlet } from "react-router";
import type { Route } from "./+types/admin";
import { requireSuperAdmin } from "server/auth.server";
import { db } from "~/lib/db.server";
import { parseBranding } from "~/lib/json";
import { Sidebar, type NavItem } from "~/components/Sidebar";
import {
  HiOutlineRectangleStack,
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineArrowLeft,
} from "react-icons/hi2";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireSuperAdmin(request);
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

// Mismo layout/sidebar que el CRM: al pasar de /app a /admin la sidebar no se
// va, solo mutan los items del menú principal. "Volver al CRM" vive en el menú
// secundario en vez de un botón "Volver" suelto.
const NAV: NavItem[] = [
  { to: "/admin", label: "Tableros", Icon: HiOutlineRectangleStack, end: true },
  { to: "/admin/usuarios", label: "Usuarios", Icon: HiOutlineUsers },
  { to: "/admin/actividad", label: "Actividad", Icon: HiOutlineClock },
];

const SECONDARY: NavItem[] = [
  { to: "/app", label: "Volver al CRM", Icon: HiOutlineArrowLeft },
];

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user, workspaceName, branding } = loaderData;
  const logo = branding?.logoUrl ?? "/brand/coregrid-logo.png";

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar
        logo={logo}
        workspaceName={workspaceName}
        user={user}
        nav={NAV}
        secondary={SECONDARY}
      />
      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
