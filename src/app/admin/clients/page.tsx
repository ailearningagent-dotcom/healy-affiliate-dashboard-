import type { Metadata } from "next";
import AdminClientsPage from "@/components/AdminClientsPage";

export const metadata: Metadata = {
  title: "Clients",
  description: "Manage all clients and their configurations",
};

export default function AdminClients() {
  return <AdminClientsPage />;
}
