import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: { default: "KuroAnime", template: "%s | KuroAnime" },
  description: "Watch anime online free — no ads, fast streams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-white font-body">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: "#1a1a28", color: "#e8e8f0", border: "1px solid rgba(255,255,255,0.07)" },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
