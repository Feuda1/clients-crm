import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";
import { NewContractorForm } from "./new-contractor-form";

export default async function NewContractorPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }


    const canCreate = hasPermission(session.user.permissions, "CREATE_CLIENT") ||
        hasPermission(session.user.permissions, "ADMIN");

    if (!canCreate) {
        redirect("/clients");
    }


    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: "asc",
        },
    });


    const addons = await prisma.addon.findMany({
        orderBy: {
            name: "asc",
        },
    });

    const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
    const agreements = await prisma.agreement.findMany({ orderBy: { name: "asc" } });

    return (
        <NewContractorForm
            users={users}
            addons={addons}
            cities={cities}
            agreements={agreements}
            currentUserId={session.user.id}
        />
    );
}
