import type { Metadata } from "next";
import AdminClientDashboard from "@/components/AdminClientDashboard";

export const metadata: Metadata = {
  title: "Client Dashboard",
  description: "Detailed analytics and data for a client workspace",
};

export default function ClientDashboardPage() {
  return <AdminClientDashboard />;
}
