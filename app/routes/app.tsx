import { useEffect, useState } from "react";
import { Form, NavLink, Outlet } from "react-router";
import type { Route } from "./+types/app";
import { getUserOrRedirect } from "server/auth.server";
import { db } from "~/lib/db.server";
import { parseBranding } from "~/lib/json";
import { cn } from "~/lib/cn";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineUsers,
  HiOutlineRectangleStack,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineArrowRightOnRectangle,
  HiOutlineKey,
  HiOutlineUserGroup,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
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
  { to: "/app/pipeline", label: "Pipeline", Icon: HiOutlineRectangleStack },
  { to: "/app/conversaciones", label: "Conversaciones", Icon: HiOutlineChatBubbleLeftRight },
  { to: "/app/contactos", label: "Contactos", Icon: HiOutlineUsers },
  { to: "/app/escalaciones", label: "Escalaciones", Icon: HiOutlineArrowTopRightOnSquare },
];

const SECONDARY = [
  { to: "/app/equipo", label: "Equipo", Icon: HiOutlineUserGroup },
  { to: "/app/cuenta", label: "Mi cuenta", Icon: HiOutlineKey },
];

const STORAGE_KEY = "crm.sidebar.collapsed";

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const { user, workspaceName, branding } = loaderData;
  const logo = branding?.logoUrl ?? "/brand/coregrid-logo.png";

  const [collapsed, setCollapsed] = useState(false);
  // Persistir preferencia (se lee en cliente para evitar mismatch SSR).
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const itemClass = (isActive: boolean, active = "bg-brand-500 text-white") =>
    cn(
      "flex items-center rounded-lg text-sm font-medium transition",
      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
      isActive ? active : "text-white/70 hover:bg-white/10 hover:text-white"
    );

  return (
    <div className="flex h-screen bg-surface">
      <aside
        className={cn(
          "flex flex-col bg-dark text-white transition-[width] duration-200",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header: logo + toggle */}
        <div
          className={cn(
            "flex h-[72px] items-center border-b border-white/10",
            collapsed ? "justify-center px-2" : "justify-between px-5"
          )}
        >
          {!collapsed && (
            <img src={logo} alt={workspaceName} className="w-36 max-w-full object-contain" />
          )}
          <button
            onClick={toggle}
            title={collapsed ? "Expandir" : "Colapsar"}
            className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {collapsed ? (
              <HiChevronDoubleRight className="h-5 w-5" />
            ) : (
              <HiChevronDoubleLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Nav principal */}
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) => itemClass(isActive)}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Secundario + usuario */}
        <div className="border-t border-white/10 p-3">
          {SECONDARY.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) => cn("mb-1", itemClass(isActive, "bg-white/10 text-white"))}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}

          {!collapsed && (
            <div className="mb-2 px-2 pt-1">
              <p className="truncate text-sm font-medium text-white">
                {user.name ?? user.email}
              </p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
          )}

          <Form method="post" action="/logout">
            <button
              type="submit"
              title={collapsed ? "Cerrar sesión" : undefined}
              className={cn(
                "w-full text-white/70 hover:bg-white/10 hover:text-white",
                "flex items-center rounded-lg text-sm font-medium transition",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"
              )}
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5 flex-shrink-0" />
              {!collapsed && "Cerrar sesión"}
            </button>
          </Form>
        </div>
      </aside>

      {/* Main — min-w-0 permite scroll horizontal del board (trampa flexbox). */}
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
