"use client";

import { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/theme-provider";

const Sidebar = dynamic(() => import("@/components/layout/sidebar").then((mod) => mod.Sidebar), {
    ssr: false,
    loading: () => <div className="fixed left-0 top-0 h-full w-16 bg-card border-r border-border" />,
});

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarWidth, setSidebarWidth] = useState(64);

    useEffect(() => {
        const updateWidth = () => {
            const saved = localStorage.getItem("sidebar-collapsed");
            setSidebarWidth(saved === "false" ? 240 : 64);
        };

        updateWidth();

        const handleSidebarToggle = () => updateWidth();
        window.addEventListener("sidebar-toggle", handleSidebarToggle);

        return () => {
            window.removeEventListener("sidebar-toggle", handleSidebarToggle);
        };
    }, []);

    return (
        <SessionProvider>
            <ThemeProvider defaultTheme="dark">
                <div className="min-h-screen bg-background">
                    <Sidebar />
                    <main
                        className="transition-all duration-300"
                        style={{ marginLeft: sidebarWidth }}
                    >
                        {children}
                    </main>
                </div>
            </ThemeProvider>
        </SessionProvider>
    );
}
