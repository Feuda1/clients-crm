import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ContractorsPageClient } from "./contractors-page-client";
import { hasPermission } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ClientsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }


    const contractors = await prisma.contractor.findMany({
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


    const isAdmin = hasPermission(session.user.permissions, "ADMIN");
    const canViewHidden =
        isAdmin ||
        hasPermission(session.user.permissions, "HIDE_ALL_CLIENTS") ||
        hasPermission(session.user.permissions, "HIDE_OWN_CLIENT");

    const canCreate =
        hasPermission(session.user.permissions, "CREATE_CLIENT") ||
        isAdmin;


    const managers = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: "asc",
        },
    });


    const cities = await prisma.city.findMany({
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: "asc",
        },
    });


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



    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Все контрагенты</h1>
                    <p className="text-muted-foreground mt-1">
                        Всего контрагентов: {contractors.length}
                    </p>
                </div>
                {canCreate && (
                    <Button asChild>
                        <Link href="/clients/new">
                            <Plus className="h-4 w-4 mr-2" />
                            Новый контрагент
                        </Link>
                    </Button>
                )}
            </div>

            <ContractorsPageClient
                contractors={contractorsWithAggregates}
                managers={managers}
                cities={cities}
                canViewHidden={canViewHidden}
            />
        </div>
    );
}
