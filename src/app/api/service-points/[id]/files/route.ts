import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";


export const dynamic = "force-dynamic";
export const maxDuration = 60;


export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const { id: servicePointId } = await params;


        const servicePoint = await prisma.servicePoint.findUnique({
            where: { id: servicePointId },
            include: {
                contractor: {
                    select: {
                        id: true,
                        managerId: true,
                        createdById: true,
                    },
                },
            },
        });

        if (!servicePoint) {
            return NextResponse.json({ error: "Точка обслуживания не найдена" }, { status: 404 });
        }


        const formData = await request.formData();
        const isPending = formData.get("isPending") === "true";

        const canEdit =
            hasPermission(session.user.permissions, "ADMIN") ||
            hasPermission(session.user.permissions, "EDIT_ALL_CLIENTS") ||
            (hasPermission(session.user.permissions, "EDIT_OWN_CLIENT") &&
                (servicePoint.contractor.createdById === session.user.id ||
                    servicePoint.contractor.managerId === session.user.id));

        const canSuggest = isPending && !!session.user.id;

        if (!canEdit && !canSuggest) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }

        const files = formData.getAll("files") as File[];
        const suggestionId = formData.get("suggestionId") as string | null;

        console.log("[DEBUG API] Files received:", files.length, "isPending:", isPending);

        if (files.length === 0) {
            return NextResponse.json({ error: "Файлы не предоставлены" }, { status: 400 });
        }


        const uploadDir = path.join(
            process.cwd(),
            "public",
            "uploads",
            "service-points",
            servicePointId
        );

        if (!existsSync(uploadDir)) {
            await fs.mkdir(uploadDir, { recursive: true });
        }

        const uploadedFiles = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = path.extname(file.name);
            const timestamp = Date.now();
            const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const filePath = path.join(uploadDir, fileName);

            await fs.writeFile(filePath, buffer);


            let fileType = "document";
            if (file.type.startsWith("image/")) fileType = "image";
            else if (file.type.startsWith("video/")) fileType = "video";

            const dbFile = await prisma.servicePointFile.create({
                data: {
                    servicePointId,
                    filename: file.name,
                    storagePath: `/uploads/service-points/${servicePointId}/${fileName}`,
                    fileType,
                    mimeType: file.type,
                    size: buffer.length,
                    isPending,
                    suggestionId: suggestionId || undefined,
                },
            });

            uploadedFiles.push(dbFile);
        }

        return NextResponse.json(uploadedFiles);
    } catch (error) {
        console.error("Error uploading service point files:", error);
        return NextResponse.json({ error: "Ошибка загрузки файлов" }, { status: 500 });
    }
}


export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const { id: servicePointId } = await params;

        const files = await prisma.servicePointFile.findMany({
            where: { servicePointId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(files);
    } catch (error) {
        console.error("Error fetching service point files:", error);
        return NextResponse.json({ error: "Ошибка получения файлов" }, { status: 500 });
    }
}


export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const { id: servicePointId } = await params;
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ error: "Идентификатор файла обязателен" }, { status: 400 });
        }


        const file = await prisma.servicePointFile.findUnique({
            where: { id: fileId },
            include: {
                servicePoint: {
                    include: {
                        contractor: {
                            select: {
                                managerId: true,
                                createdById: true,
                            },
                        },
                    },
                },
            },
        });

        if (!file || file.servicePointId !== servicePointId) {
            return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
        }


        const canEdit =
            hasPermission(session.user.permissions, "ADMIN") ||
            hasPermission(session.user.permissions, "EDIT_ALL_CLIENTS") ||
            (hasPermission(session.user.permissions, "EDIT_OWN_CLIENT") &&
                (file.servicePoint.contractor.createdById === session.user.id ||
                    file.servicePoint.contractor.managerId === session.user.id));

        if (!canEdit) {
            return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
        }


        const filePath = path.join(process.cwd(), "public", file.storagePath);
        if (existsSync(filePath)) {
            await fs.unlink(filePath);
        }


        await prisma.servicePointFile.delete({
            where: { id: fileId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting service point file:", error);
        return NextResponse.json({ error: "Ошибка удаления файла" }, { status: 500 });
    }
}
