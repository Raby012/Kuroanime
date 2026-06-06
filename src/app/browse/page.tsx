// src/app/browse/page.tsx
import { Suspense } from "react";
import BrowseClient from "@/components/BrowseClient";

export const metadata = { title: "Browse Anime — KuroAnime" };
export default function BrowsePage() {
  return <Suspense fallback={<div className="min-h-screen bg-surface" />}><BrowseClient /></Suspense>;
}
