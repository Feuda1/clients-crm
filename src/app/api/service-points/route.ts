import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const body = await request.json();
        const {
            contractorId,
            name,
            address,
            cityId,
            frontsCount,
            frontsOnService,
            description,
            notes,
            individualTerms,
            addonIds,
            crmId,
        } = body;

        if (!contractorId || !name) {
            return NextResponse.json({ error: "Необходимы contractorId и name" }, { status: 400 });
        }

        const contractor = await prisma.contractor.findUnique({
            where: { id: contractorId },
            select: {
                createdById: true,
                managerId: true,
            },
        });

        if (!contractor) {
            return NextResponse.json({ error: "Контрагент не найден" }, { status: 404 });
        }

        const canEdit =
            hasPermission(session.user.permissions, "ADMIN") ||
            hasPermission(session.user.permissions, "EDIT_ALL_CLIENTS") ||
            (hasPermission(session.user.permissions, "EDIT_OWN_CLIENT") &&
                (contractor.createdById === session.user.id ||
                    contractor.managerId === session.user.id));

        if (!canEdit) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const newPoint = await prisma.servicePoint.create({
            data: {
                contractorId,
                name,
                address,
                cityId: cityId || null,
                frontsCount: frontsCount || 0,
                frontsOnService: frontsOnService || 0,
                description,
                notes,
                individualTerms,
                crmId,
                addons: addonIds ? {
                    create: addonIds.map((addonId: string) => ({
                        addonId,
                    })),
                } : undefined,
            },
            include: {
                city: true,
                addons: {
                    include: {
                        addon: true,
                    },
                },
                files: true,
            },
        });

        return NextResponse.json(newPoint, { status: 201 });
    } catch (error) {
        console.error("Ошибка создания точки обслуживания:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}
