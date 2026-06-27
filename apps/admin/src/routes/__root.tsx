import { NotFoundComponent } from "@/components/not-found";
import { Toaster } from "@07nghiep/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useLocation } from "@tanstack/react-router";

import Sidebar from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
  trpc: typeof trpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    return { session };
  },
  head: () => ({
    meta: [
      {
        title: "Admin | 07nghiep",
      },
      {
        name: "description",
        content: "Trang quản trị 07nghiep - Quản lý người dùng, việc làm và hệ thống",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/07logo.png",
      },
    ],
  }),
});

function RootComponent() {
  const location = useLocation();
  const { session } = Route.useRouteContext();

  const isLoginPage = location.pathname === "/login";

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        {isLoginPage || !session.data ? (
          <Outlet />
        ) : (
          <Sidebar>
            <Outlet />
          </Sidebar>
        )}
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
