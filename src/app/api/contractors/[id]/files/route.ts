import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

interface RouteContext {
    params: Promise<{ id: string }>;
}


export async function POST(request: Request, context: RouteContext) {
    try {
        const session = await auth();
        const { id: contractorId } = await context.params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }


        const contractor = await prisma.contractor.findUnique({
            where: { id: contractorId },
        });

        if (!contractor) {
            return NextResponse.json({ error: "Контрагент не найден" }, { status: 404 });
        }

        const formData = await request.formData();
        const files = formData.getAll("files") as File[];
        const isPending = formData.get("isPending") === "true";

        if (files.length === 0) {
            return NextResponse.json({ error: "Файлы не предоставлены" }, { status: 400 });
        }


        const uploadDir = join(process.cwd(), "public", "uploads", "contractors", contractorId);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const uploadedFiles = [];

        for (const file of files) {

            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const storageName = `${timestamp}_${safeName}`;
            const storagePath = `/uploads/contractors/${contractorId}/${storageName}`;
            const fullPath = join(uploadDir, storageName);


            const mimeType = file.type;
            let fileType = "document";
            if (mimeType.startsWith("image/")) fileType = "image";
            else if (mimeType.startsWith("video/")) fileType = "video";


            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            await writeFile(fullPath, buffer);


            const dbFile = await prisma.contractorFile.create({
                data: {
                    contractorId,
                    filename: file.name,
                    storagePath,
                    fileType,
                    mimeType,
                    size: file.size,
                    isPending,
                },
            });

            uploadedFiles.push(dbFile);
        }

        return NextResponse.json(uploadedFiles);
    } catch (error) {
        console.error("Error uploading files:", error);
        if (error instanceof Error) {
            console.error(error.stack);
        }
        return NextResponse.json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}


export async function GET(request: Request, context: RouteContext) {
    try {
        const session = await auth();
        const { id: contractorId } = await context.params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const files = await prisma.contractorFile.findMany({
            where: {
                contractorId,
                isPending: false
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(files);
    } catch (error) {
        console.error("Error fetching files:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}


export async function DELETE(request: Request, context: RouteContext) {
    try {
        const session = await auth();
        const { id: contractorId } = await context.params;

        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
        }

        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ error: "Идентификатор файла обязателен" }, { status: 400 });
        }


        await prisma.contractorFile.delete({
            where: { id: fileId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting file:", error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}
