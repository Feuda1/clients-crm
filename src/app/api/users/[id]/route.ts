import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";
import bcrypt from "bcryptjs";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
    try {
        const session = await auth();
        const { id } = await context.params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        if (
            !hasPermission(session.user.permissions, "ADMIN") &&
            session.user.id !== id
        ) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                login: true,
                name: true,
                avatar: true,
                permissions: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
        }

        return NextResponse.json({
            ...user,
            permissions: JSON.parse(user.permissions),
        });
    } catch (error) {
        console.error("Ошибка получения пользователя:", error);
        return NextResponse.json(
            { error: "Внутренняя ошибка сервера" },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        const session = await auth();
        const { id } = await context.params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        if (
            !hasPermission(session.user.permissions, "ADMIN") &&
            session.user.id !== id
        ) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const body = await request.json();

        const updateData: {
            name?: string;
            permissions?: string;
            password?: string;
        } = {};

        if (body.name) updateData.name = body.name;

        if (body.permissions && hasPermission(session.user.permissions, "ADMIN")) {
            updateData.permissions = JSON.stringify(body.permissions);
        }

        if (body.password) {
            updateData.password = await bcrypt.hash(body.password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                login: true,
                name: true,
                permissions: true,
                createdAt: true,
            },
        });

        return NextResponse.json({
            ...user,
            permissions: JSON.parse(user.permissions),
        });
    } catch (error) {
        console.error("Ошибка обновления пользователя:", error);
        return NextResponse.json(
            { error: "Внутренняя ошибка сервера" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, context: RouteContext) {
    try {
        const session = await auth();
        const { id } = await context.params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        if (!hasPermission(session.user.permissions, "ADMIN")) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        if (session.user.id === id) {
            return NextResponse.json(
                { error: "Нельзя удалить самого себя" },
                { status: 400 }
            );
        }

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Ошибка удаления пользователя:", error);
        return NextResponse.json(
            { error: "Внутренняя ошибка сервера" },
            { status: 500 }
        );
    }
}
