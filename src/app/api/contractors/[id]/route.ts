import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const contractor = await prisma.contractor.findUnique({
            where: { id },
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
                createdBy: {
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
                        files: true,
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
                files: {
                    where: {
                        isPending: false,
                    },
                },
            },
        });

        if (!contractor) {
            return NextResponse.json({ error: "Контрагент не найден" }, { status: 404 });
        }

        const canViewAll = hasPermission(session.user.permissions, "VIEW_ALL_CLIENTS") ||
            hasPermission(session.user.permissions, "ADMIN");

        if (!canViewAll && contractor.managerId !== session.user.id) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const totalFronts = contractor.servicePoints.reduce((sum, sp) => sum + sp.frontsCount, 0);
        const frontsOnService = contractor.servicePoints.reduce((sum, sp) => sum + sp.frontsOnService, 0);

        return NextResponse.json({
            ...contractor,
            totalFronts,
            frontsOnService,
        });
    } catch (error) {
        console.error("Ошибка получения контрагента:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const existing = await prisma.contractor.findUnique({
            where: { id },
            select: { managerId: true, isHidden: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Контрагент не найден" }, { status: 404 });
        }

        const isAdmin = hasPermission(session.user.permissions, "ADMIN");
        const canEditAll = hasPermission(session.user.permissions, "EDIT_ALL_CLIENTS");
        const canEditOwn = hasPermission(session.user.permissions, "EDIT_OWN_CLIENT");
        const isOwner = existing.managerId === session.user.id;

        if (!isAdmin && !canEditAll && !(canEditOwn && isOwner)) {
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
            isHidden,
        } = body;

        if (isHidden !== undefined && isHidden !== existing.isHidden) {
            const canHideAll = hasPermission(session.user.permissions, "HIDE_ALL_CLIENTS") || isAdmin;
            const canHideOwn = hasPermission(session.user.permissions, "HIDE_OWN_CLIENT");

            if (!canHideAll && !(canHideOwn && isOwner)) {
                return NextResponse.json({ error: "Запрещено изменять видимость" }, { status: 403 });
            }
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (inn !== undefined) updateData.inn = inn;
        if (hasChain !== undefined) updateData.hasChain = hasChain;
        if (status !== undefined) updateData.status = status;
        if (generalDescription !== undefined) updateData.generalDescription = generalDescription;
        if (generalNotes !== undefined) updateData.generalNotes = generalNotes;
        if (generalIndividualTerms !== undefined) updateData.generalIndividualTerms = generalIndividualTerms;
        if (primaryCityId !== undefined) updateData.primaryCityId = primaryCityId;
        if (agreementId !== undefined) updateData.agreementId = agreementId;
        if (managerId !== undefined) updateData.managerId = managerId;
        if (isHidden !== undefined) updateData.isHidden = isHidden;

        const contractor = await prisma.contractor.update({
            where: { id },
            data: updateData,
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

        return NextResponse.json(contractor);
    } catch (error) {
        console.error("Ошибка обновления контрагента:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const existing = await prisma.contractor.findUnique({
            where: { id },
            select: { managerId: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Контрагент не найден" }, { status: 404 });
        }

        const isAdmin = hasPermission(session.user.permissions, "ADMIN");
        const canDeleteAll = hasPermission(session.user.permissions, "DELETE_ALL_CLIENTS");
        const canDeleteOwn = hasPermission(session.user.permissions, "DELETE_OWN_CLIENT");
        const isOwner = existing.managerId === session.user.id;

        if (!isAdmin && !canDeleteAll && !(canDeleteOwn && isOwner)) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        await prisma.contractor.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Ошибка удаления контрагента:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}
