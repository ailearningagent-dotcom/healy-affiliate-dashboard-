import type { Metadata } from "next";
import AgentsPage from "@/components/AgentsPage";

export const metadata: Metadata = {
  title: "AI Agents",
  description:
    "Run AI-powered marketing agents for content creation, prospect research, sales outreach, and more",
};

export default function Agents() {
  return <AgentsPage />;
}
