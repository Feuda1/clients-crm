import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";

export async function GET(request: Request) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status");
        const cityId = searchParams.get("cityId");
        const managerId = searchParams.get("managerId");
        const myClients = searchParams.get("myClients") === "true";

        const where: Record<string, unknown> = {};

        const isHiddenParam = searchParams.get("isHidden");
        if (isHiddenParam === "true") {
            where.isHidden = true;
        } else if (isHiddenParam === "false") {
            where.isHidden = false;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { inn: { contains: search } },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (cityId) {
            where.primaryCityId = cityId;
        }

        if (myClients || managerId === session.user.id) {
            where.managerId = session.user.id;
        } else if (managerId) {
            where.managerId = managerId;
        }

        const canViewAll = hasPermission(session.user.permissions, "VIEW_ALL_CLIENTS") ||
            hasPermission(session.user.permissions, "ADMIN");
        const isAdmin = hasPermission(session.user.permissions, "ADMIN");

        const canViewHiddenAll = hasPermission(session.user.permissions, "HIDE_ALL_CLIENTS") || isAdmin;
        const canViewHiddenOwn = hasPermission(session.user.permissions, "HIDE_OWN_CLIENT");

        if (!canViewHiddenAll) {
            if (canViewHiddenOwn) {
                where.OR = [
                    { isHidden: false },
                    { isHidden: true, managerId: session.user.id }
                ];
            } else {
                where.isHidden = false;
            }
        }

        if (!canViewAll) {
            where.managerId = session.user.id;
        }

        const contractors = await prisma.contractor.findMany({
            where,
            include: {
                primaryCity: true,
                agreement: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                servicePoints: {
                    include: {
                        city: true,
                        addons: {
                            include: {
                                addon: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        servicePoints: true,
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        const result = contractors.map((contractor) => {
            const totalFronts = contractor.servicePoints.reduce((sum, sp) => sum + sp.frontsCount, 0);
            const frontsOnService = contractor.servicePoints.reduce((sum, sp) => sum + sp.frontsOnService, 0);

            return {
                ...contractor,
                totalFronts,
                frontsOnService,
                servicePointsCount: contractor._count.servicePoints,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Ошибка получения контрагентов:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const canCreate = hasPermission(session.user.permissions, "CREATE_CLIENT") ||
            hasPermission(session.user.permissions, "ADMIN");

        if (!canCreate) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            inn,
            hasChain,
            status,
            generalDescription,
            generalNotes,
            generalIndividualTerms,
            primaryCityId,
            agreementId,
            managerId,
            servicePoints,
        } = body;

        if (!name || !inn) {
            return NextResponse.json({ error: "Название и ИНН обязательны" }, { status: 400 });
        }

        const sanitizedData = {
            primaryCityId: primaryCityId || null,
            agreementId: agreementId || null,
            managerId: managerId || null,
        };

        const contractor = await prisma.contractor.create({
            data: {
                name,
                inn,
                hasChain: hasChain || false,
                status: status || "ACTIVE",
                generalDescription,
                generalNotes,
                generalIndividualTerms,
                primaryCityId: sanitizedData.primaryCityId,
                agreementId: sanitizedData.agreementId,
                managerId: sanitizedData.managerId,
                createdById: session.user.id,
                servicePoints: servicePoints ? {
                    create: servicePoints.map((sp: {
                        name: string;
                        address?: string;
                        cityId?: string;
                        frontsCount?: number;
                        frontsOnService?: number;
                        description?: string;
                        notes?: string;
                        individualTerms?: string;
                        addonIds?: string[];
                    }) => ({
                        name: sp.name,
                        address: sp.address,
                        cityId: sp.cityId || null,
                        frontsCount: sp.frontsCount || 0,
                        frontsOnService: sp.frontsOnService || 0,
                        description: sp.description,
                        notes: sp.notes,
                        individualTerms: sp.individualTerms,
                        addons: sp.addonIds ? {
                            create: sp.addonIds.map((addonId: string) => ({
                                addonId,
                            })),
                        } : undefined,
                    })),
                } : undefined,
            },
            include: {
                primaryCity: true,
                agreement: true,
                manager: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                servicePoints: {
                    include: {
                        city: true,
                        addons: {
                            include: {
                                addon: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(contractor, { status: 201 });
    } catch (error) {
        console.error("Ошибка создания контрагента:", error);
        return NextResponse.json({
            error: "Внутренняя ошибка сервера",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
