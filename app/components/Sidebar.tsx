import { useEffect, useState } from "react";
import { Form, NavLink } from "react-router";
import type { ComponentType } from "react";
import {
  HiOutlineArrowRightOnRectangle,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
} from "react-icons/hi2";
import { cn } from "~/lib/cn";

export type NavItem = {
  to: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  end?: boolean;
};

const STORAGE_KEY = "crm.sidebar.collapsed";

// Sidebar compartida entre el CRM (/app) y el panel de plataforma (/admin).
// El layout no cambia al moverse entre ambos: solo mutan los items (`nav`).
export function Sidebar({
  logo,
  workspaceName,
  user,
  nav,
  secondary,
}: {
  logo: string;
  workspaceName: string;
  user: { name: string | null; email: string };
  nav: NavItem[];
  secondary: NavItem[];
}) {
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
        {nav.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
        {secondary.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
  );
}
