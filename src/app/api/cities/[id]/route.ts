import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();

    if (!session?.user?.permissions?.includes("ADMIN")) return new NextResponse("Доступ запрещен", { status: 403 });

    const { id } = await params;
    try {
        const body = await req.json();
        const { name } = body;

        const updated = await prisma.city.update({
            where: { id },
            data: { name }
        });
        return NextResponse.json(updated);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Ошибка обновления города" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.permissions?.includes("ADMIN")) return new NextResponse("Доступ запрещен", { status: 403 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    try {
        if (force) {

            await prisma.contractor.updateMany({
                where: { primaryCityId: id },
                data: { primaryCityId: null }
            });
            await prisma.servicePoint.updateMany({
                where: { cityId: id },
                data: { cityId: null }
            });
        }

        await prisma.city.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);

        return NextResponse.json({ error: "Невозможно удалить город, используемый клиентами" }, { status: 400 });
    }
}
