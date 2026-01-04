import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Не авторизован", { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fileId = searchParams.get("fileId");

        if (!fileId) {
            return new NextResponse("Идентификатор файла обязателен", { status: 400 });
        }

        const file = await prisma.contractorFile.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            return new NextResponse("Файл не найден", { status: 404 });
        }


        const relativePath = file.storagePath.startsWith("/") ? file.storagePath.slice(1) : file.storagePath;
        const fullPath = join(process.cwd(), "public", relativePath);

        console.log(`[DOWNLOAD] Attempting to download file: ${file.filename} (ID: ${fileId})`);
        console.log(`[DOWNLOAD] Resolved path: ${fullPath}`);

        if (!existsSync(fullPath)) {
            console.error(`[DOWNLOAD] File missing at path: ${fullPath}`);
            return new NextResponse(`Файл не найден на сервере. Путь: ${relativePath}`, { status: 404 });
        }

        const fileBuffer = await readFile(fullPath);


        const safeAsciiName = file.filename.replace(/[^\x20-\x7E]/g, "_");

        const encodedFilename = encodeURIComponent(file.filename).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": file.mimeType || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodedFilename}`,
                "Content-Length": file.size.toString(),
            },
        });
    } catch (error) {
        console.error("Download error:", error);
        return new NextResponse("Внутренняя ошибка сервера", { status: 500 });
    }
}
