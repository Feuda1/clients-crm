import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        if (!body.name) {
            return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
        }

        const addon = await prisma.addon.update({
            where: { id },
            data: {
                name: body.name,
                description: body.description,
                color: body.color,
            }
        });

        return NextResponse.json(addon);
    } catch (error) {
        console.error("Error updating addon:", error);
        return NextResponse.json({ error: "Ошибка при обновлении дополнения" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.addon.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting addon:", error);
        return NextResponse.json({ error: "Ошибка при удалении дополнения" }, { status: 500 });
    }
}
