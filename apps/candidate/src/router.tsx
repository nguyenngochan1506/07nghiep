import { createRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { routeTree } from "./routeTree.gen";
import { createTrpcOptions, getQueryClient } from "./utils/trpc";
import type { RouterAppContext } from "./routes/__root";
import Loader from "./components/loader";

export function getRouter() {
  const queryClient = getQueryClient();
  const trpc = createTrpcOptions(queryClient);
  const router = createRouter({
    routeTree,
    defaultPendingComponent: Loader,
    context: { trpc, queryClient } satisfies RouterAppContext,
  });

  return routerWithQueryClient(router, queryClient);
}
