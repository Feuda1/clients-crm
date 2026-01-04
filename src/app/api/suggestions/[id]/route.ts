import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

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

        const suggestion = await prisma.contractorSuggestion.findUnique({
            where: { id },
            include: {
                contractor: {
                    select: {
                        id: true,
                        name: true,
                        inn: true,
                        status: true,
                        hasChain: true,
                        generalNotes: true,
                        generalDescription: true,
                        generalIndividualTerms: true,
                        managerId: true,
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
        });

        if (!suggestion) {
            return NextResponse.json({ error: "Предложение не найдено" }, { status: 404 });
        }

        return NextResponse.json({
            ...suggestion,
            changes: JSON.parse(suggestion.changes),
            client: suggestion.contractor,
            clientId: suggestion.contractorId,
        });
    } catch (error) {
        console.error("Error fetching suggestion:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}


export async function PUT(request: Request, context: RouteContext) {
    try {
        const session = await auth();
        const { id } = await context.params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const body = await request.json();
        const { action, reviewComment } = body;

        if (!action || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "Неверное действие. Используйте 'approve' или 'reject'" }, { status: 400 });
        }


        const suggestion = await prisma.contractorSuggestion.findUnique({
            where: { id },
            include: {
                contractor: {
                    select: {
                        managerId: true,
                    },
                },
                files: true,
            },
        });

        if (!suggestion) {
            return NextResponse.json({ error: "Предложение не найдено" }, { status: 404 });
        }


        if (suggestion.contractor.managerId !== session.user.id) {
            const isAdmin = session.user.permissions?.includes("ADMIN");
            if (!isAdmin) {
                return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
            }
        }

        if (suggestion.status !== "PENDING") {
            return NextResponse.json({ error: "Предложение уже обработано" }, { status: 400 });
        }

        const changes = JSON.parse(suggestion.changes);
        const acceptedFields = body.acceptedFields as string[] | undefined;


        const deletePendingFiles = async () => {
            for (const file of suggestion.files) {
                try {
                    const fullPath = join(process.cwd(), "public", file.storagePath);
                    await unlink(fullPath);
                } catch (e) {
                    console.error(`Failed to delete file ${file.storagePath}`, e);
                }
                await prisma.contractorFile.delete({ where: { id: file.id } });
            }
        };

        if (action === "approve") {

            const updateData: Record<string, unknown> = {};
            const shouldApplyFiles = !acceptedFields || acceptedFields.includes("files");


            for (const field of Object.keys(changes)) {
                if (field === "files" || field === "servicePoints") continue;

                if (acceptedFields) {
                    if (acceptedFields.includes(field)) {
                        updateData[field] = changes[field].new;
                    }
                } else {
                    updateData[field] = changes[field].new;
                }
            }


            const servicePointsOverride = body.servicePointsOverride as {
                updates: Array<{ id: string, diff: Record<string, { new: unknown }> }>;
                deletes: string[];
            } | undefined;

            const applyServicePoints = async (tx: any) => {
                const shouldApplyAllSP = !acceptedFields || acceptedFields.includes("servicePoints");

                let spUpdates: Array<{ id: string, diff: Record<string, { new: unknown }> }> = [];
                let spDeletes: string[] = [];

                if (servicePointsOverride) {
                    spUpdates = servicePointsOverride.updates;
                    spDeletes = servicePointsOverride.deletes;
                } else if (shouldApplyAllSP && changes.servicePoints) {
                    const spChangeFull = changes.servicePoints.new as {
                        updates: Array<{ id: string, diff: Record<string, { new: unknown }> }>;
                        deletes: string[];
                    };
                    spUpdates = spChangeFull.updates || [];
                    spDeletes = spChangeFull.deletes || [];
                }


                if (spDeletes.length > 0) {
                    await tx.servicePoint.deleteMany({
                        where: { id: { in: spDeletes } }
                    });
                }


                for (const update of spUpdates) {
                    const { id, diff } = update;
                    const spUpdateData: Record<string, unknown> = {};

                    for (const [key, val] of Object.entries(diff)) {
                        if (key === "addonIds") continue;

                        if (key === "files") {

                            const filesDiff = (val as { new: { added: string[], removed: string[] } }).new;
                            const addedIds = filesDiff?.added || [];
                            const removedIds = filesDiff?.removed || [];

                            if (addedIds.length > 0) {
                                await tx.servicePointFile.updateMany({
                                    where: { id: { in: addedIds } },
                                    data: { isPending: false, suggestionId: null }
                                });
                            }

                            if (removedIds.length > 0) {
                                await tx.servicePointFile.deleteMany({
                                    where: { id: { in: removedIds } }
                                });

                            }
                            continue;
                        }

                        const newValue = (val as { new: unknown }).new;

                        spUpdateData[key] = newValue;
                    }

                    if (Object.keys(spUpdateData).length > 0) {
                        await tx.servicePoint.update({
                            where: { id },
                            data: spUpdateData
                        });
                    }
                }
            };


            await prisma.$transaction(async (tx) => {

                if (Object.keys(updateData).length > 0) {
                    await tx.contractor.update({
                        where: { id: suggestion.contractorId },
                        data: updateData,
                    });
                }


                await applyServicePoints(tx);


                if (shouldApplyFiles && changes.files) {
                    if (suggestion.files.length > 0) {
                        await tx.contractorFile.updateMany({
                            where: { suggestionId: id },
                            data: { isPending: false, suggestionId: null }
                        });
                    }

                    const removedFileIds = changes.files.new?.removed as string[] | undefined;
                    if (removedFileIds && removedFileIds.length > 0) {

                        await tx.contractorFile.deleteMany({
                            where: { id: { in: removedFileIds } }
                        });
                    }
                } else {

                }


                await tx.contractorSuggestion.update({
                    where: { id },
                    data: {
                        status: "APPROVED",
                        reviewedById: session.user.id,
                        reviewedAt: new Date(),
                        reviewComment,
                    },
                });
            });

            if (shouldApplyFiles && changes.files) {
                const removedFileIds = changes.files.new?.removed as string[] | undefined;
                if (removedFileIds && removedFileIds.length > 0) {

                }
            } else {
                await deletePendingFiles();
            }


            return NextResponse.json({ success: true, message: "Suggestion approved and applied" });
        } else {
            await deletePendingFiles();

            await prisma.contractorSuggestion.update({
                where: { id },
                data: {
                    status: "REJECTED",
                    reviewedById: session.user.id,
                    reviewedAt: new Date(),
                    reviewComment,
                },
            });

            return NextResponse.json({ success: true, message: "Suggestion rejected" });
        }
    } catch (error) {
        console.error("Error processing suggestion:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
