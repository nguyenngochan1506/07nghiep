import { createFileRoute } from "@tanstack/react-router";
import { HomeComponent, homeSeoHead } from "./home";

export const Route = createFileRoute("/")({
  head: homeSeoHead,
  component: HomeComponent,
});
