import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";
import { createSeoHead, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      redirect({
        to: getLoginRedirectTarget(),
        throw: true,
      });
    }
  },
  head: () =>
    createSeoHead({
      title: "Đăng nhập | 07nghiep",
      description: "Đăng nhập vào 07nghiep để quản lý hồ sơ, theo dõi đơn ứng tuyển và lưu việc làm.",
      url: `${SITE_URL}/login`,
      noIndex: true,
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(true);
  const redirectTo = getLoginRedirectTarget();

  return showSignIn ? (
    <SignInForm redirectTo={redirectTo} onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
  );
}

function getLoginRedirectTarget(): "/home" | "/business-application" | "/billing" {
  if (typeof window === "undefined") return "/home";

  const redirectTo = new URLSearchParams(window.location.search).get("redirect");
  if (redirectTo === "/billing") return "/billing";
  return redirectTo === "/business-application" ? "/business-application" : "/home";
}
