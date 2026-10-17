import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { ConvexClientProvider } from "./ConvexClientProvider";
import Navbar from "./components/Navbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import Provider from "./provider";
import { AppSidebar } from "@/app/components/Appsidebar";
import { PresenceHeartbeat } from "./components/PresenceHeartbeat";
import { AppearanceProvider } from "./context/AppearanceContext";
import { CyberRain } from "./components/CyberRain";
import { UserSync } from "./components/UserSync";
import { RouteGuard } from "./components/RouteGuard";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitGirls",
  description: "Meet someone real — video, messages, and gifts in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ConvexClientProvider>
              <Provider>
                <AppearanceProvider>
                  {/* Ensures the Convex users row exists on every page */}
                  <UserSync />
                  <PresenceHeartbeat />
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full flex-col">
                      <Navbar />
                      <div className="flex flex-1 overflow-hidden">
                        <AppSidebar />

                        {/* Rain lives inside this wrapper, so it can't reach the sidebar */}
                        <div className="relative flex min-w-0 flex-1 overflow-hidden">
                          <CyberRain />
                          <SidebarInset className="flex-1 overflow-auto">
                            <main className="p-4 lg:p-6">
                              <RouteGuard>{children}</RouteGuard>
                            </main>
                          </SidebarInset>
                        </div>
                      </div>
                    </div>
                  </SidebarProvider>

                  <Toaster richColors />
                </AppearanceProvider>
              </Provider>
            </ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
