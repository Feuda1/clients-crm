import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MyClientsPageClient } from "./my-clients-page-client";
import { hasPermission } from "@/lib/utils";
import type { SuggestionStatus } from "@/generated/prisma/enums.js";

export default async function MyClientsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }


    const contractors = await prisma.contractor.findMany({
        where: {
            managerId: session.user.id,
        },
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
            servicePoints: {
                include: {
                    city: true,
                    addons: {
                        include: {
                            addon: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    servicePoints: true,
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
    });


    let suggestionsWithParsedChanges: Array<{
        id: string;
        contractorId: string;
        changes: Record<string, { old: unknown; new: unknown }>;
        comment: string | null;
        status: SuggestionStatus;
        createdAt: Date;
        contractor: { id: string; name: string; inn: string };
        author: { id: string; name: string; avatar: string | null };
    }> = [];

    try {
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
            },
            orderBy: {
                createdAt: "desc",
            },
        });


        suggestionsWithParsedChanges = suggestions.map((s) => ({
            ...s,
            changes: JSON.parse(s.changes),
        }));
    } catch (error) {
        console.error("Error loading suggestions:", error);
    }


    const contractorsWithAggregates = contractors.map((contractor) => {
        const totalFronts = contractor.servicePoints.reduce((sum, sp) => sum + sp.frontsCount, 0);
        const frontsOnService = contractor.servicePoints.reduce((sum, sp) => sum + sp.frontsOnService, 0);

        const allAddons = contractor.servicePoints.flatMap(sp =>
            sp.addons.map(a => a.addon)
        );
        const uniqueAddons = Array.from(
            new Map(allAddons.map(a => [a.id, a])).values()
        );

        return {
            ...contractor,
            totalFronts,
            frontsOnService,
            servicePointsCount: contractor._count.servicePoints,
            allAddons: uniqueAddons,
        };
    });


    const cities = [...new Set(contractors.map((c) => c.primaryCity?.name).filter(Boolean))] as string[];

    const canCreate =
        hasPermission(session.user.permissions, "CREATE_CLIENT") ||
        hasPermission(session.user.permissions, "ADMIN");

    return (
        <MyClientsPageClient
            initialContractors={contractorsWithAggregates}
            cities={cities}
            canCreate={canCreate}
            suggestions={suggestionsWithParsedChanges}
        />
    );
}
