import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const roles = await prisma.role.findMany({
        orderBy: { name: "asc" },
    });

    return NextResponse.json(
        roles.map((r) => ({
            ...r,
            permissions: JSON.parse(r.permissions),
        }))
    );
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.permissions?.includes("ADMIN")) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const body = await request.json();
    const { name, permissions, description, color, isDefault } = body;

    if (!name || !permissions || !Array.isArray(permissions)) {
        return NextResponse.json({ error: "Название и права обязательны" }, { status: 400 });
    }

    try {
        if (isDefault) {
            await prisma.role.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }

        const role = await prisma.role.create({
            data: {
                name,
                permissions: JSON.stringify(permissions),
                description: description || null,
                color: color || null,
                isDefault: isDefault || false,
            },
        });

        return NextResponse.json({
            ...role,
            permissions: JSON.parse(role.permissions),
        });
    } catch (error: unknown) {
        console.error("Ошибка создания роли:", error);
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
            return NextResponse.json({ error: "Роль с таким названием уже существует" }, { status: 400 });
        }
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}
