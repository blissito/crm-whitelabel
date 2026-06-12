import type { Route } from "./+types/s.$token";
import { resolveShareData } from "server/share.server";
import { SharedView } from "~/components/share/SharedView";

export function meta() {
  return [{ title: "CRM CoreGrid" }, { name: "robots", content: "noindex" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const data = await resolveShareData(params.token);
  if (!data) {
    throw new Response("Link inválido o expirado", { status: 404 });
  }
  return { token: params.token, data };
}

export default function SharePage({ loaderData }: Route.ComponentProps) {
  return <SharedView token={loaderData.token} initial={loaderData.data} />;
}

export function ErrorBoundary() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-dark">Link no disponible</h1>
        <p className="mt-2 text-sm text-gray-500">
          Este enlace es inválido o ya expiró.
        </p>
      </div>
    </main>
  );
}
