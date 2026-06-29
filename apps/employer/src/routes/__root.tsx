import { NotFoundComponent } from "@/components/not-found";
import { Toaster } from "@07nghiep/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
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

const SITE_URL = "https://07nghiep.site";
const SEO_TITLE = "07nghiep - Cổng nhà tuyển dụng, quản lý tuyển dụng hiệu quả";
const SEO_DESCRIPTION =
  "07nghiep giúp nhà tuyển dụng đăng tin, quản lý ứng viên, theo dõi tuyển dụng và vận hành quy trình tuyển người trong một workspace rõ ràng.";
const SEO_IMAGE = `${SITE_URL}/07logo.png`;

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    return { session };
  },
  head: () => ({
    meta: [
      { title: SEO_TITLE },
      { name: "description", content: SEO_DESCRIPTION },
      {
        name: "keywords",
        content:
          "tuyển dụng, đăng tin tuyển dụng, quản lý ứng viên, nhà tuyển dụng, tuyển người, 07nghiep",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "07nghiep" },
      { property: "og:title", content: SEO_TITLE },
      { property: "og:description", content: SEO_DESCRIPTION },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: SEO_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SEO_TITLE },
      { name: "twitter:description", content: SEO_DESCRIPTION },
      { name: "twitter:image", content: SEO_IMAGE },
    ],
    links: [
      {
        rel: "canonical",
        href: SITE_URL,
      },
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
  const isOAuthPopupCallback = location.pathname === "/auth/google/callback";

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        {isLoginPage || isOAuthPopupCallback || !session.data ? (
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
