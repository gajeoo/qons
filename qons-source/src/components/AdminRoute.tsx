import { useQuery } from "convex/react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export function AdminRoute() {
  const isAdmin = useQuery(api.admin.isAdmin);

  // Still loading
  if (isAdmin === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
