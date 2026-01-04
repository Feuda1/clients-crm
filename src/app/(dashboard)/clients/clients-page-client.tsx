"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { ClientCard } from "@/components/clients/client-card";
import { SearchFilters, FilterState } from "@/components/clients/search-filters";
import type { ServiceStatus } from "@/generated/prisma/enums.js";

interface ClientData {
    id: string;
    name: string;
    inn: string;
    contractor: string;
    city: string;
    status: ServiceStatus;
    hasChain: boolean;
    frontsCount: number;
    frontsOnService: number | null;
    notes: string | null;
    manager: {
        id: string;
        name: string;
        avatar: string | null;
    } | null;
    addons: {
        addon: {
            id: string;
            name: string;
            color: string | null;
        };
    }[];
}

interface Manager {
    id: string;
    name: string;
}

interface Addon {
    id: string;
    name: string;
}

interface ClientsPageClientProps {
    clients: ClientData[];
    managers?: Manager[];
    addons?: Addon[];
    cities?: string[];
}

export function ClientsPageClient({
    clients,
    managers = [],
    addons = [],
    cities = [],
}: ClientsPageClientProps) {
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");


    const [filters, setFilters] = useState<FilterState>(() => {
        const statusParam = searchParams.get("status");
        const status = statusParam ? [statusParam as ServiceStatus] : [];

        return {
            status,
            hasChain: null,
            city: "",
            managerId: "",
            addonIds: [],
        };
    });


    useEffect(() => {
        const statusParam = searchParams.get("status");
        console.log("ClientsPageClient Effect:", { statusParam, currentFilters: filters });
        if (statusParam) {
            setFilters(prev => ({
                ...prev,
                status: [statusParam as ServiceStatus]
            }));
        } else {
            if (searchParams.toString() === "") {
                setFilters(prev => ({ ...prev, status: [] }));
            }
        }
    }, [searchParams]);

    const filteredClients = useMemo(() => {
        return clients.filter((client) => {

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    client.name.toLowerCase().includes(query) ||
                    client.inn.toLowerCase().includes(query) ||
                    client.city.toLowerCase().includes(query) ||
                    client.contractor.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }


            if (filters.status.length > 0 && !filters.status.includes(client.status)) {
                return false;
            }


            if (filters.hasChain !== null && client.hasChain !== filters.hasChain) {
                return false;
            }


            if (filters.city && client.city !== filters.city) {
                return false;
            }


            if (filters.managerId && client.manager?.id !== filters.managerId) {
                return false;
            }


            if (filters.addonIds.length > 0) {
                const clientAddonIds = client.addons.map((a) => a.addon.id);
                const hasAllAddons = filters.addonIds.every((id) =>
                    clientAddonIds.includes(id)
                );
                if (!hasAllAddons) return false;
            }

            return true;
        });
    }, [clients, searchQuery, filters]);

    return (
        <div className="space-y-6">
            <SearchFilters
                onSearch={setSearchQuery}
                onFilterChange={setFilters}
                filters={filters}
                managers={managers}
                addons={addons}
                cities={cities}
            />

            {filteredClients.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {clients.length === 0
                            ? "Нет клиентов. Создайте первого клиента!"
                            : "Нет клиентов, соответствующих фильтрам"}
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground">
                        Показано: {filteredClients.length} из {clients.length}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredClients.map((client) => (
                            <ClientCard
                                key={client.id}
                                client={client}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
