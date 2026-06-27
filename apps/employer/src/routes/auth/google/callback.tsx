import { OAuthPopupCallback } from "@07nghiep/ui/components/oauth-popup-callback";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/google/callback")({
  component: OAuthPopupCallback,
});
