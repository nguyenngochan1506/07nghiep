import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

import SignInForm from "@/components/sign-in-form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      redirect({
        to: "/dashboard",
        throw: true,
      });
    }
  },
  component: RouteComponent,
});
function RouteComponent() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session) {
      window.location.replace("/dashboard");
    }
  }, [isPending, session]);

  if (session) {
    return null;
  }

  return <SignInForm />;
}
