import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: () => (
    <div className="p-4">
      {/* <div className="bg-red-100 text-red-600 p-2 mb-4 rounded"> */}
      {/* </div> */}
      <Outlet />
    </div>
  ),
});
