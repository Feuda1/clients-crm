import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/utils";

export async function GET() {
    try {
        const addons = await prisma.addon.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(addons);
    } catch (error) {
        console.error("Ошибка получения дополнений:", error);
        return NextResponse.json({ error: "Ошибка при загрузке дополнений" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }



    if (!hasPermission(session.user.permissions, "MANAGE_ADDONS")) {
        return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    try {
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
        }

        const addon = await prisma.addon.create({
            data: {
                name: body.name,
                description: body.description,
                color: body.color,
            }
        });

        return NextResponse.json(addon);
    } catch (error) {
        console.error("Ошибка создания дополнения:", error);
        return NextResponse.json({ error: "Ошибка при создании дополнения" }, { status: 500 });
    }
}
