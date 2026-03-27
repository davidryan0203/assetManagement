import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@frontend/context/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asset Management System",
  description: "Enterprise Inventory Management System",
  icons: {
    icon: "/brand-logo.jpeg",
    shortcut: "/brand-logo.jpeg",
    apple: "/brand-logo.jpeg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#fff",
                color: "#1f2937",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
