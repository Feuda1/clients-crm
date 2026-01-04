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

        const servicePoint = await prisma.servicePoint.findUnique({
            where: { id },
            include: {
                city: true,
                contractor: {
                    select: {
                        id: true,
                        name: true,
                        managerId: true,
                    },
                },
                addons: {
                    include: {
                        addon: true,
                    },
                },
                files: true,
            },
        });

        if (!servicePoint) {
            return NextResponse.json({ error: "Точка обслуживания не найдена" }, { status: 404 });
        }

        return NextResponse.json(servicePoint);
    } catch (error) {
        console.error("Error fetching service point:", error);
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

        const existing = await prisma.servicePoint.findUnique({
            where: { id },
            include: {
                contractor: {
                    select: { managerId: true },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Точка обслуживания не найдена" }, { status: 404 });
        }


        const isAdmin = hasPermission(session.user.permissions, "ADMIN");
        const canEditAll = hasPermission(session.user.permissions, "EDIT_ALL_CLIENTS");
        const canEditOwn = hasPermission(session.user.permissions, "EDIT_OWN_CLIENT");
        const isOwner = existing.contractor.managerId === session.user.id;

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
            crmId,
        } = body;


        const servicePoint = await prisma.servicePoint.update({
            where: { id },
            data: {
                name,
                address,
                cityId,
                frontsCount,
                frontsOnService,
                description,
                notes,
                individualTerms,
                crmId,
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


        if (addonIds !== undefined) {

            await prisma.servicePointAddon.deleteMany({
                where: { servicePointId: id },
            });


            if (addonIds.length > 0) {
                await prisma.servicePointAddon.createMany({
                    data: addonIds.map((addonId: string) => ({
                        servicePointId: id,
                        addonId,
                    })),
                });
            }


            const updated = await prisma.servicePoint.findUnique({
                where: { id },
                include: {
                    city: true,
                    addons: {
                        include: {
                            addon: true,
                        },
                    },
                },
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json(servicePoint);
    } catch (error) {
        console.error("Error updating service point:", error);
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

        const existing = await prisma.servicePoint.findUnique({
            where: { id },
            include: {
                contractor: {
                    select: { managerId: true },
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: "Точка обслуживания не найдена" }, { status: 404 });
        }


        const isAdmin = hasPermission(session.user.permissions, "ADMIN");
        const canEditAll = hasPermission(session.user.permissions, "EDIT_ALL_CLIENTS");
        const canEditOwn = hasPermission(session.user.permissions, "EDIT_OWN_CLIENT");
        const isOwner = existing.contractor.managerId === session.user.id;

        if (!isAdmin && !canEditAll && !(canEditOwn && isOwner)) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        await prisma.servicePoint.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting service point:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}
