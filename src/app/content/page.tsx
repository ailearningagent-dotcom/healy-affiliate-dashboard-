import type { Metadata } from "next";
import ContentLibrary from "@/components/ContentLibrary";

export const metadata: Metadata = {
  title: "Content Library",
  description:
    "Browse and manage AI-generated content including blog posts, social media content, and landing pages",
};

export default function Content() {
  return <ContentLibrary />;
}
