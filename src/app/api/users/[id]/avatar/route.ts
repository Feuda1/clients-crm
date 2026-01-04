import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;

    if (session.user.id !== id && !session.user.permissions?.includes("ADMIN")) {
        return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
        return NextResponse.json({ error: "Файл не предоставлен" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Разрешены только изображения" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Максимальный размер файла 5MB" }, { status: 400 });
    }

    try {
        const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${id}-${Date.now()}.${ext}`;
        const filePath = join(uploadDir, fileName);

        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        const avatarUrl = `/uploads/avatars/${fileName}`;
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { avatar: avatarUrl },
            select: { id: true, avatar: true },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Ошибка загрузки аватара:", error);
        return NextResponse.json(
            { error: "Ошибка при загрузке аватара" },
            { status: 500 }
        );
    }
}
