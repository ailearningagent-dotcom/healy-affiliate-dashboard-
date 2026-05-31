import type { Metadata } from "next";
import LeadsPage from "@/components/LeadsPage";

export const metadata: Metadata = {
  title: "Leads & Appointments",
  description:
    "Manage prospects, qualify leads, schedule appointments, and import leads via CSV",
};

export default function Leads() {
  return <LeadsPage />;
}
