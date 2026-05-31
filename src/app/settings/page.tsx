import type { Metadata } from "next";
import SettingsPage from "@/components/SettingsPage";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Configure your business profile, API keys, LLM provider, and app preferences",
};

export default function Settings() {
  return <SettingsPage />;
}
