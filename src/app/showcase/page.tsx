import type { Metadata } from "next";
import ShowcasePage from "@/components/ShowcasePage";

export const metadata: Metadata = {
  title: "Platform Showcase",
  description:
    "Explore all features of the MarketAI platform — AI agents, dashboard, content library, leads, booking, admin panel, and more",
};

export default function Showcase() {
  return <ShowcasePage />;
}
