import type { Metadata } from "next";
import AdminAppointmentsPage from "@/components/AdminAppointmentsPage";

export const metadata: Metadata = {
  title: "Appointments",
  description: "View all booked consultations and appointments",
};

export default function AdminAppointments() {
  return <AdminAppointmentsPage />;
}
