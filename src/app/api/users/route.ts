import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        if (!hasPermission(session.user.permissions, "ADMIN")) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                login: true,
                name: true,
                avatar: true,
                permissions: true,
                createdAt: true,
                _count: {
                    select: {
                        managedContractors: true,
                        createdContractors: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const usersWithParsedPermissions = users.map((user) => ({
            ...user,
            permissions: JSON.parse(user.permissions),
            _count: {
                managedContractors: Number(user._count.managedContractors),
                createdContractors: Number(user._count.createdContractors),
            },
        }));

        return NextResponse.json(usersWithParsedPermissions);
    } catch (error) {
        console.error("Ошибка получения пользователей:", error);
        return NextResponse.json(
            { error: "Внутренняя ошибка сервера" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        if (!hasPermission(session.user.permissions, "ADMIN")) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const body = await request.json();

        const existingUser = await prisma.user.findUnique({
            where: { login: body.login },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Пользователь с таким логином уже существует" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);

        const user = await prisma.user.create({
            data: {
                login: body.login,
                password: hashedPassword,
                name: body.name,
                permissions: JSON.stringify(body.permissions || []),
            },
            select: {
                id: true,
                login: true,
                name: true,
                permissions: true,
                createdAt: true,
            },
        });

        return NextResponse.json(
            {
                ...user,
                permissions: JSON.parse(user.permissions),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Ошибка создания пользователя:", error);
        return NextResponse.json(
            { error: "Внутренняя ошибка сервера" },
            { status: 500 }
        );
    }
}
