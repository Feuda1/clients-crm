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

        const servicePoints = await prisma.servicePoint.findMany({
            where: { contractorId: id },
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
        });

        return NextResponse.json(servicePoints);
    } catch (error) {
        console.error("Error fetching service points:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}


export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id: contractorId } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }


        const contractor = await prisma.contractor.findUnique({
            where: { id: contractorId },
            select: { managerId: true },
        });

        if (!contractor) {
            return NextResponse.json({ error: "Контрагент не найден" }, { status: 404 });
        }


        const isAdmin = hasPermission(session.user.permissions, "ADMIN");
        const canEditAll = hasPermission(session.user.permissions, "EDIT_ALL_CLIENTS");
        const canEditOwn = hasPermission(session.user.permissions, "EDIT_OWN_CLIENT");
        const isOwner = contractor.managerId === session.user.id;

        if (!isAdmin && !canEditAll && !(canEditOwn && isOwner)) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            address,
            cityId,
            frontsCount,
            frontsOnService,
            description,
            notes,
            individualTerms,
            addonIds,
        } = body;

        if (!name) {
            return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
        }

        const servicePoint = await prisma.servicePoint.create({
            data: {
                contractorId,
                name,
                address,
                cityId,
                frontsCount: frontsCount || 0,
                frontsOnService: frontsOnService || 0,
                description,
                notes,
                individualTerms,
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
            },
        });

        return NextResponse.json(servicePoint, { status: 201 });
    } catch (error) {
        console.error("Error creating service point:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}
