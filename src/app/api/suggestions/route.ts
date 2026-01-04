import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";


export async function GET() {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }


        const suggestions = await prisma.contractorSuggestion.findMany({
            where: {
                contractor: {
                    managerId: session.user.id,
                },
            },
            include: {
                contractor: {
                    select: {
                        id: true,
                        name: true,
                        inn: true,
                    },
                },
                author: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });


        const result = suggestions.map((s) => ({
            ...s,
            changes: JSON.parse(s.changes),
            client: s.contractor,
            clientId: s.contractorId,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}


export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        if (!hasPermission(session.user.permissions, "SUGGEST_EDITS") && !hasPermission(session.user.permissions, "ADMIN")) {
            return NextResponse.json({ error: "Доступ запрещен: У вас нет прав на предложение изменений" }, { status: 403 });
        }

        const body = await request.json();
        const { clientId, contractorId, changes, comment } = body;


        const targetContractorId = contractorId || clientId;

        if (!targetContractorId || !changes) {
            return NextResponse.json({ error: "contractorId и changes обязательны" }, { status: 400 });
        }


        const contractor = await prisma.contractor.findUnique({
            where: { id: targetContractorId },
            select: { id: true, managerId: true },
        });

        if (!contractor) {
            return NextResponse.json({ error: "Контрагент не найден" }, { status: 404 });
        }


        const suggestion = await prisma.contractorSuggestion.create({
            data: {
                contractorId: targetContractorId,
                authorId: session.user.id,
                changes: JSON.stringify(changes),
                comment,
                status: "PENDING",
            },
            include: {
                contractor: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                author: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });


        if (changes.files && changes.files.new && Array.isArray(changes.files.new.added)) {
            const addedFileIds = changes.files.new.added as string[];
            if (addedFileIds.length > 0) {
                await prisma.contractorFile.updateMany({
                    where: {
                        id: { in: addedFileIds },
                        contractorId: targetContractorId,
                    },
                    data: {
                        suggestionId: suggestion.id,
                    },
                });
            }
        }

        return NextResponse.json({
            ...suggestion,
            client: suggestion.contractor,
            clientId: suggestion.contractorId,
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating suggestion:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        return NextResponse.json({ error: "Внутренняя ошибка сервера", details: String(error) }, { status: 500 });
    }
}
