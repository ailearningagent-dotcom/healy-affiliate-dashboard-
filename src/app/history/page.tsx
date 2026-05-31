import type { Metadata } from "next";
import AgentHistory from "@/components/AgentHistory";

export const metadata: Metadata = {
  title: "Agent History",
  description: "View past AI agent executions, re-run agents, and track performance over time",
};

export default function HistoryPage() {
  return <AgentHistory />;
}
