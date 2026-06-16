import { createRootRouteWithContext, redirect } from "@tanstack/react-router";
import { env } from "@07nghiep/env/candidate";
import { authClient } from "@/lib/auth-client";

const APP_ROLE = env.VITE_APP_ROLE;

function isAuthorized(userRole: string): boolean {
  if (APP_ROLE === "ADMIN") return userRole === "ADMIN";
  if (APP_ROLE === "EMPLOYER") return userRole === "ADMIN" || userRole === "EMPLOYER";
  if (APP_ROLE === "CANDIDATE")
    return userRole === "ADMIN" || userRole === "CANDIDATE" || userRole === "EMPLOYER";
  return false;
}

export const authorizedRoles = isAuthorized;
