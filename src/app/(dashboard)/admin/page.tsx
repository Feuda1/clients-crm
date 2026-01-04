import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/utils";
import { AdminPageClient } from "./admin-page-client";

export default async function AdminPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }


    if (!hasPermission(session.user.permissions, "ADMIN")) {
        redirect("/clients");
    }


    const users = await prisma.user.findMany({
        select: {
            id: true,
            login: true,
            name: true,
            avatar: true,
            permissions: true,
            createdAt: true,
            _count: {
                select: {
                    managedContractors: true,
                    createdContractors: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });


    const roles = await prisma.role.findMany({
        orderBy: { name: "asc" },
    });


    const usersWithParsedPermissions = users.map((user) => ({
        ...user,
        permissions: JSON.parse(user.permissions) as string[],
        _count: {
            managedClients: Number(user._count.managedContractors),
            createdClients: Number(user._count.createdContractors),
        },
    }));

    const rolesWithParsedPermissions = roles.map((role) => ({
        ...role,
        permissions: JSON.parse(role.permissions) as string[],
    }));

    return (
        <AdminPageClient
            users={usersWithParsedPermissions}
            roles={rolesWithParsedPermissions}
        />
    );
}
