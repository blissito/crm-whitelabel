import { Outlet } from "react-router";
import type { Route } from "./+types/app";
import { getUserOrRedirect, isAdmin, isSuperAdmin } from "server/auth.server";
import { db } from "~/lib/db.server";
import { parseBranding } from "~/lib/json";
import { Sidebar, type NavItem } from "~/components/Sidebar";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineUsers,
  HiOutlineRectangleStack,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineKey,
  HiOutlineUserGroup,
  HiOutlinePuzzlePiece,
  HiOutlineClock,
  HiOutlineShieldCheck,
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
    admin: isAdmin(user),
    superAdmin: isSuperAdmin(user),
  };
}

const NAV: NavItem[] = [
  { to: "/app/pipeline", label: "Pipeline", Icon: HiOutlineRectangleStack },
  { to: "/app/conversaciones", label: "Conversaciones", Icon: HiOutlineChatBubbleLeftRight },
  { to: "/app/contactos", label: "Contactos", Icon: HiOutlineUsers },
  { to: "/app/escalaciones", label: "Escalaciones", Icon: HiOutlineArrowTopRightOnSquare },
  { to: "/app/integraciones", label: "Integraciones", Icon: HiOutlinePuzzlePiece },
];

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { user, workspaceName, branding, admin, superAdmin } = loaderData;
  const logo = branding?.logoUrl ?? "/brand/coregrid-logo.png";

  // Menú secundario: Equipo/Mi cuenta siempre; Actividad solo admin;
  // Panel admin solo super-admin.
  const SECONDARY: NavItem[] = [
    ...(admin
      ? [{ to: "/app/actividad", label: "Actividad", Icon: HiOutlineClock }]
      : []),
    { to: "/app/equipo", label: "Equipo", Icon: HiOutlineUserGroup },
    { to: "/app/cuenta", label: "Mi cuenta", Icon: HiOutlineKey },
    ...(superAdmin
      ? [{ to: "/admin", label: "Panel admin", Icon: HiOutlineShieldCheck }]
      : []),
  ];

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar
        logo={logo}
        workspaceName={workspaceName}
        user={user}
        nav={NAV}
        secondary={SECONDARY}
      />

      {/* Main — min-w-0 permite el scroll horizontal del board (trampa flexbox);
          overflow-y-auto deja scrollear páginas altas (cuenta, equipo). */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
