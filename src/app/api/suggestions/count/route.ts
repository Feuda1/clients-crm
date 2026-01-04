import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";


export async function GET() {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }


        const count = await prisma.contractorSuggestion.count({
            where: {
                status: "PENDING",
                contractor: {
                    managerId: session.user.id,
                },
            },
        });


        const managedClientsCount = await prisma.contractor.count({
            where: {
                managerId: session.user.id,
            },
        });

        return NextResponse.json({ count, managedClientsCount });
    } catch (error) {
        console.error("Error counting suggestions:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}
