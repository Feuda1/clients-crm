import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;

    const role = await prisma.role.findUnique({
        where: { id },
    });

    if (!role) {
        return NextResponse.json({ error: "Роль не найдена" }, { status: 404 });
    }

    return NextResponse.json({
        ...role,
        permissions: JSON.parse(role.permissions),
    });
}


export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.permissions?.includes("ADMIN")) {
            return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, permissions, description, color, isDefault } = body;


        if (isDefault) {
            await prisma.role.updateMany({
                where: { isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        const role = await prisma.role.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(permissions && { permissions: JSON.stringify(permissions) }),
                ...(description !== undefined && { description }),
                ...(color !== undefined && { color: color || null }),
                ...(isDefault !== undefined && { isDefault }),
            },
        });

        return NextResponse.json({
            ...role,
            permissions: JSON.parse(role.permissions),
        });
    } catch (error: unknown) {
        console.error("Error updating role:", error);
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
            return NextResponse.json({ error: "Роль с таким названием уже существует" }, { status: 400 });
        }
        if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
            return NextResponse.json({ error: "Роль не найдена" }, { status: 404 });
        }
        return NextResponse.json({ error: `Внутренняя ошибка сервера: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
    }
}


export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.permissions?.includes("ADMIN")) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const { id } = await params;

    try {
        await prisma.role.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
            return NextResponse.json({ error: "Роль не найдена" }, { status: 404 });
        }
        throw error;
    }
}
