"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export function AdminShell({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
}) {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-wine/15 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-heading text-lg font-semibold text-wine"
          >
            <Logo height={28} />
            <span>Admin</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {isAuthenticated && (
              <>
                <Link href="/admin" className="hover:text-wine">
                  Pedidos
                </Link>
                <Link href="/admin/settings" className="hover:text-wine">
                  Settings
                </Link>
              </>
            )}
            {isAuthenticated ? (
              <button
                type="button"
                className="hover:text-wine"
                onClick={() => {
                  void fetch("/api/admin/logout", { method: "POST" }).then(
                    () => {
                      window.location.href = "/admin/login";
                    },
                  );
                }}
              >
                Sair
              </button>
            ) : (
              <Link href="/admin/login" className="hover:text-wine">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
