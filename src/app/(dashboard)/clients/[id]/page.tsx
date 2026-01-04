import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { ContractorDetailClient } from "./contractor-detail-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ContractorDetailPage({ params }: PageProps) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
        redirect("/login");
    }

    const contractor = await prisma.contractor.findUnique({
        where: { id },
        include: {
            primaryCity: true,
            agreement: true,
            manager: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    name: true,
                },
            },
            servicePoints: {
                include: {
                    city: true,
                    addons: {
                        include: {
                            addon: true,
                        },
                    },
                    files: {
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
            files: {
                where: {
                    isPending: false,
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });

    if (!contractor) {
        notFound();
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


    const allAddons = await prisma.addon.findMany({
        orderBy: {
            name: "asc",
        },
    });

    const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
    const agreements = await prisma.agreement.findMany({ orderBy: { name: "asc" } });

    return (
        <ContractorDetailClient
            contractor={contractor}
            users={users}
            allAddons={allAddons}
            cities={cities}
            agreements={agreements}
            currentUserId={session.user.id}
            userPermissions={session.user.permissions}
        />
    );
}
