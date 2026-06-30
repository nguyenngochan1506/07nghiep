import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import { createSitemapResponse, isSitemapRequest } from "@/lib/sitemap.server";

const startHandler = createStartHandler(defaultStreamHandler);

async function handler(request: Request) {
  if (isSitemapRequest(request)) {
    return createSitemapResponse();
  }

  return startHandler(request);
}

export default createServerEntry({ fetch: handler });
