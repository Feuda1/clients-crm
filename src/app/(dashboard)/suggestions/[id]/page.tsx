import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { SuggestionDetailClient } from "./suggestion-detail-client";
import { hasPermission } from "@/lib/utils";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function SuggestionPage({ params }: Props) {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }


    const suggestion = await prisma.contractorSuggestion.findUnique({
        where: { id },
        include: {
            contractor: {
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true,
                        },
                    },
                    primaryCity: true,
                    agreement: true,
                    servicePoints: {
                        include: {
                            city: true,
                            addons: {
                                include: {
                                    addon: true,
                                },
                            },
                            files: {
                                orderBy: { createdAt: "desc" },
                            },
                        },
                    },
                    files: {
                        where: { isPending: false },
                        orderBy: { createdAt: "desc" },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            author: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                },
            },
            files: true,
            reviewedBy: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!suggestion) {
        notFound();
    }


    const isManager = suggestion.contractor.managerId === session.user.id;
    const isAdmin = hasPermission(session.user.permissions, "ADMIN");

    if (!isManager && !isAdmin) {
        redirect("/my-clients");
    }


    const [cities, agreements, users] = await Promise.all([
        prisma.city.findMany({ select: { id: true, name: true } }),
        prisma.agreement.findMany({ select: { id: true, name: true } }),
        prisma.user.findMany({ select: { id: true, name: true } }),
    ]);


    const changes = JSON.parse(suggestion.changes) as Record<string, { old: unknown; new: unknown }>;


    const totalFronts = suggestion.contractor.servicePoints.reduce((sum, sp) => sum + sp.frontsCount, 0);
    const frontsOnService = suggestion.contractor.servicePoints.reduce((sum, sp) => sum + sp.frontsOnService, 0);

    return (
        <SuggestionDetailClient
            suggestion={{
                id: suggestion.id,
                status: suggestion.status,
                comment: suggestion.comment,
                createdAt: suggestion.createdAt,
                reviewedAt: suggestion.reviewedAt,
                changes,
                author: suggestion.author,
                reviewer: suggestion.reviewedBy,
                files: suggestion.files,
            }}
            contractor={{
                id: suggestion.contractor.id,
                name: suggestion.contractor.name,
                inn: suggestion.contractor.inn,
                status: suggestion.contractor.status,
                hasChain: suggestion.contractor.hasChain,
                totalFronts,
                frontsOnService,
                primaryCity: suggestion.contractor.primaryCity,
                agreement: suggestion.contractor.agreement,
                generalNotes: suggestion.contractor.generalNotes,
                generalDescription: suggestion.contractor.generalDescription,
                generalIndividualTerms: suggestion.contractor.generalIndividualTerms,
                manager: suggestion.contractor.manager,
                createdBy: suggestion.contractor.createdBy,
                createdAt: suggestion.contractor.createdAt,
                servicePoints: suggestion.contractor.servicePoints,
                files: suggestion.contractor.files,
            }}
            lookups={{
                cities,
                agreements,
                users,
            }}
        />
    );
}

