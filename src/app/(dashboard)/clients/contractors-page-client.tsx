"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ContractorCard } from "@/components/clients/contractor-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ServiceStatus } from "@/generated/prisma/enums.js";
import { STATUS_LABELS, cn } from "@/lib/utils";

interface ContractorData {
    id: string;
    name: string;
    inn: string;
    status: ServiceStatus;
    hasChain: boolean;
    totalFronts: number;
    frontsOnService: number;
    servicePointsCount: number;
    generalNotes: string | null;
    primaryCity: {
        id: string;
        name: string;
    } | null;
    agreement: {
        id: string;
        name: string;
    } | null;
    manager: {
        id: string;
        name: string;
        avatar: string | null;
    } | null;
    allAddons: {
        id: string;
        name: string;
        color: string | null;
    }[];
    isHidden: boolean;
}

interface Manager {
    id: string;
    name: string;
}

interface City {
    id: string;
    name: string;
}

interface ContractorsPageClientProps {
    contractors: ContractorData[];
    managers?: Manager[];
    cities?: City[];
    canViewHidden?: boolean;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const STATUS_OPTIONS: ComboboxItem[] = [
    { value: "", label: "Все статусы" },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
    })),
];

export function ContractorsPageClient({
    contractors,
    managers = [],
    cities = [],
    canViewHidden = false,
}: ContractorsPageClientProps) {

    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
    const [cityFilter, setCityFilter] = useState(searchParams.get("city") || "");
    const [managerFilter, setManagerFilter] = useState("");
    const [activeTab, setActiveTab] = useState<"active" | "hidden">("active");


    useEffect(() => {
        const status = searchParams.get("status");
        if (status) setStatusFilter(status);

        const city = searchParams.get("city");
        if (city) setCityFilter(city);
    }, [searchParams]);


    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);


    const cityItems: ComboboxItem[] = [
        { value: "", label: "Все города" },
        ...cities.map((c) => ({ value: c.id, label: c.name })),
    ];

    const managerItems: ComboboxItem[] = [
        { value: "", label: "Все менеджеры" },
        ...managers.map((m) => ({ value: m.id, label: m.name })),
    ];


    const filteredContractors = useMemo(() => {
        return contractors.filter((contractor) => {

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    contractor.name.toLowerCase().includes(query) ||
                    contractor.inn.toLowerCase().includes(query) ||
                    contractor.primaryCity?.name.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }


            if (statusFilter && contractor.status !== statusFilter) {
                return false;
            }


            if (cityFilter && contractor.primaryCity?.id !== cityFilter) {
                return false;
            }


            if (managerFilter && contractor.manager?.id !== managerFilter) {
                return false;
            }


            if (managerFilter && contractor.manager?.id !== managerFilter) {
                return false;
            }


            if (activeTab === "active" && contractor.isHidden) {
                return false;
            }
            if (activeTab === "hidden" && !contractor.isHidden) {
                return false;
            }

            return true;
        });
    }, [contractors, searchQuery, statusFilter, cityFilter, managerFilter, activeTab]);


    const totalPages = Math.ceil(filteredContractors.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedContractors = filteredContractors.slice(startIndex, endIndex);


    const handleFilterChange = () => {
        setCurrentPage(1);
    };


    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("");
        setCityFilter("");
        setManagerFilter("");
        setCurrentPage(1);
    };

    const hasActiveFilters = searchQuery || statusFilter || cityFilter || managerFilter;

    return (
        <div className="space-y-6">
            {canViewHidden && (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "hidden")} className="w-full">
                    <TabsList>
                        <TabsTrigger value="active">Активные клиенты</TabsTrigger>
                        <TabsTrigger value="hidden">Скрытые клиенты</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}


            <div className="bg-card rounded-xl border border-border p-4">

                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                handleFilterChange();
                            }}
                            placeholder="Поиск по названию, ИНН или городу..."
                            className="pl-10"
                        />
                    </div>
                    {hasActiveFilters && (
                        <Button variant="outline" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-2" />
                            Сбросить
                        </Button>
                    )}
                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Статус</label>
                        <Combobox
                            items={STATUS_OPTIONS}
                            value={statusFilter}
                            onSelect={(val) => {
                                setStatusFilter(val);
                                handleFilterChange();
                            }}
                            placeholder="Все статусы"
                            searchPlaceholder="Поиск статуса..."
                            emptyText="Статус не найден"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Город</label>
                        <Combobox
                            items={cityItems}
                            value={cityFilter}
                            onSelect={(val) => {
                                setCityFilter(val);
                                handleFilterChange();
                            }}
                            placeholder="Все города"
                            searchPlaceholder="Поиск города..."
                            emptyText="Город не найден"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Менеджер</label>
                        <Combobox
                            items={managerItems}
                            value={managerFilter}
                            onSelect={(val) => {
                                setManagerFilter(val);
                                handleFilterChange();
                            }}
                            placeholder="Все менеджеры"
                            searchPlaceholder="Поиск менеджера..."
                            emptyText="Менеджер не найден"
                        />
                    </div>
                </div>
            </div>


            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Найдено: <span className="font-medium text-foreground">{filteredContractors.length}</span> из {contractors.length}
                    {paginatedContractors.length < filteredContractors.length && (
                        <span> (показано {startIndex + 1}-{Math.min(endIndex, filteredContractors.length)})</span>
                    )}
                </p>

                <div className="flex items-center gap-4">

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">На странице:</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(val) => {
                                setPageSize(Number(val));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[80px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>


                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-3 text-sm">
                                {currentPage} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>


            {paginatedContractors.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {contractors.length === 0
                            ? "Нет контрагентов. Создайте первого!"
                            : "Нет контрагентов, соответствующих фильтрам"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedContractors.map((contractor) => (
                        <ContractorCard key={contractor.id} contractor={contractor} />
                    ))}
                </div>
            )}


            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Назад
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-9"
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Вперёд
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    );
}
