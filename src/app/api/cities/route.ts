import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/utils";

export async function GET() {
    const session = await auth();
    if (!session?.user) return new NextResponse("Не авторизован", { status: 401 });

    const items = await prisma.city.findMany({
        orderBy: { name: 'asc' }
    });
    return NextResponse.json(items);
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) return new NextResponse("Не авторизован", { status: 401 });

    if (!hasPermission(session.user.permissions, "MANAGE_CITIES")) {
        return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
        }

        const item = await prisma.city.create({
            data: { name }
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error("Ошибка создания города:", error);
        return NextResponse.json({ error: "Город уже существует или ошибка сервера" }, { status: 400 });
    }
}
