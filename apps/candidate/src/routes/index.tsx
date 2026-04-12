import { redirect } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    redirect({
      to: "/home",
      throw: true,
    });
  },
  component: () => null,
});
