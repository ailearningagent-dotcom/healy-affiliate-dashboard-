import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin | MarketAI",
    template: "%s | Admin | MarketAI",
  },
  description: "Super admin panel for managing clients and platform settings",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
