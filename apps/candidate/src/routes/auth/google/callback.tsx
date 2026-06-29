import { OAuthPopupCallback } from "@07nghiep/ui/components/oauth-popup-callback";
import { createFileRoute } from "@tanstack/react-router";
import { createSeoHead, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/auth/google/callback")({
  head: () =>
    createSeoHead({
      title: "Đăng nhập | 07nghiep",
      description: "Đang xử lý đăng nhập qua Google.",
      url: `${SITE_URL}/login`,
      noIndex: true,
    }),
  component: OAuthPopupCallback,
});
