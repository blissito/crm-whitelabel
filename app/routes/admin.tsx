import { NavLink, Outlet, Link } from "react-router";
import type { Route } from "./+types/admin";
import { requireSuperAdmin } from "server/auth.server";
import { HiOutlineArrowLeft } from "react-icons/hi2";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireSuperAdmin(request);
  return { email: user.email };
}

const TABS = [
  { to: "/admin", label: "Tableros", end: true },
  { to: "/admin/usuarios", label: "Usuarios", end: false },
  { to: "/admin/actividad", label: "Actividad", end: false },
];

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center gap-6 border-b border-outlines bg-dark px-6 py-3 text-white">
        <span className="font-semibold">Panel de plataforma</span>
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm text-white/60">
          <span className="hidden sm:inline">{loaderData.email}</span>
          <Link to="/app" className="inline-flex items-center gap-1.5 hover:text-white">
            <HiOutlineArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
