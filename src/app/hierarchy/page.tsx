import type { Metadata } from "next";
import HierarchyPage from "@/components/HierarchyPage";

export const metadata: Metadata = {
  title: "Org Hierarchy",
  description:
    "Explore the AI organizational structure with executive, finance, research, creative, and sales departments",
};

export default function HierarchyRoute() {
  return <HierarchyPage />;
}
