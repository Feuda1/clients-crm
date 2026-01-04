"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";
import { startOfDay, endOfDay } from "date-fns";

export interface AnalyticsStats {
    totalClients: number;
    activeClients: number;
    totalPoints: number;
    activePoints: number;
    clientsByStatus: Record<string, number>;
    clientsByMonth: { date: string; count: number }[];
    topManagers?: { name: string; count: number; avatar: string | null }[];
}

export async function getDashboardStats(
    from: Date,
    to: Date,
    scope: "general" | "own" = "own"
): Promise<{ success: boolean; data?: AnalyticsStats; error?: string }> {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, error: "Не авторизован" };
    }

    const permissions = session.user.permissions;
    const canViewGeneral = hasPermission(permissions, "VIEW_ANALYTICS_GENERAL");
    const canViewOwn = hasPermission(permissions, "VIEW_ANALYTICS_OWN");


    if (scope === "general" && !canViewGeneral) {
        return { success: false, error: "Нет прав на просмотр общей статистики" };
    }

    if (scope === "own" && !canViewOwn && !canViewGeneral) {
        return { success: false, error: "Нет прав на просмотр статистики" };
    }

    const where: any = {};

    if (scope === "own") {
        where.OR = [
            { managerId: session.user.id },
            { createdById: session.user.id }
        ];
    } else {
    }

    const dateFilter = {
        createdAt: {
            gte: startOfDay(from),
            lte: endOfDay(to),
        },
    };

    try {


        const totalClientsPromise = prisma.contractor.count({ where });

        const activeClientsPromise = prisma.contractor.count({
            where: {
                ...where,
                status: "ACTIVE"
            }
        });


        const totalPointsPromise = prisma.servicePoint.count({
            where: {
                contractor: where
            }
        });

        const activePointsFrontsPromise = prisma.servicePoint.aggregate({
            where: {
                contractor: where
            },
            _sum: {
                frontsOnService: true
            }
        });


        const byStatusPromise = prisma.contractor.groupBy({
            by: ["status"],
            where,
            _count: true,
        });


        const createdInPeriodPromise = prisma.contractor.findMany({
            where: {
                ...where,
                ...dateFilter
            },
            select: {
                createdAt: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });


        let topManagersPromise: Promise<any[]> = Promise.resolve([]);
        if (scope === "general") {
            // @ts-expect-error
            topManagersPromise = prisma.contractor.groupBy({
                by: ["managerId"],
                _count: {
                    _all: true
                },
                where: {
                    managerId: { not: null },
                    ...dateFilter
                },
                orderBy: {
                    _count: {
                        managerId: 'desc'
                    }
                },
                take: 5
            });
        }

        const [
            totalClients,
            activeClients,
            totalPoints,
            activePointsSum,
            byStatus,
            createdInPeriod,
            topManagersGroup
        ] = await Promise.all([
            totalClientsPromise,
            activeClientsPromise,
            totalPointsPromise,
            activePointsFrontsPromise,
            byStatusPromise,
            createdInPeriodPromise,
            topManagersPromise
        ]);


        const clientsByStatus: Record<string, number> = {};
        byStatus.forEach(item => {
            clientsByStatus[item.status] = item._count;
        });


        const clientsByMonthMap = new Map<string, number>();
        createdInPeriod.forEach(c => {
            // YYYY-MM
            const key = c.createdAt.toISOString().slice(0, 7);
            clientsByMonthMap.set(key, (clientsByMonthMap.get(key) || 0) + 1);
        });

        const clientsByMonth = Array.from(clientsByMonthMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));


        let topManagers: { name: string; count: number; avatar: string | null }[] = [];
        if (scope === "general" && topManagersGroup.length > 0) {
            const managerIds = topManagersGroup.map((g: any) => g.managerId).filter(Boolean);
            const users = await prisma.user.findMany({
                where: { id: { in: managerIds } },
                select: { id: true, name: true, avatar: true }
            });

            topManagers = topManagersGroup.map((g: any) => {
                const user = users.find(u => u.id === g.managerId);
                return {
                    name: user?.name || "Неизвестный",
                    count: g._count._all || g._count,
                    avatar: user?.avatar || null
                };
            }).sort((a, b) => b.count - a.count);
        }

        return {
            success: true,
            data: {
                totalClients,
                activeClients,
                totalPoints,
                activePoints: activePointsSum._sum.frontsOnService || 0,
                clientsByStatus,
                clientsByMonth,
                topManagers: scope === "general" ? topManagers : undefined
            }
        };

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return { success: false, error: "Ошибка получения данных" };
    }
}
