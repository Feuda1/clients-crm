import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/utils";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
    title: "Дашборд | CRM",
    description: "Аналитика и статистика",
};

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const permissions = session.user.permissions;
    const canViewGeneral = hasPermission(permissions, "VIEW_ANALYTICS_GENERAL");
    const canViewOwn = hasPermission(permissions, "VIEW_ANALYTICS_OWN");
    const isAdmin = hasPermission(permissions, "ADMIN");

    if (!canViewGeneral && !canViewOwn && !isAdmin) {
        redirect("/clients");
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Дашборд</h2>
            </div>
            <Suspense fallback={<div>Загрузка...</div>}>
                <DashboardClient
                    canViewGeneral={canViewGeneral || isAdmin}
                    canViewOwn={canViewOwn || isAdmin}
                    userId={session.user.id}
                />
            </Suspense>
        </div>
    );
}
