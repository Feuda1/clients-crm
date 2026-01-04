"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ContractorCard } from "@/components/clients/contractor-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Plus, X, MessageSquare, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { STATUS_LABELS } from "@/lib/utils";
import type { ServiceStatus, SuggestionStatus } from "@/generated/prisma/enums.js";

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
}

interface Suggestion {
    id: string;
    contractorId: string;
    changes: Record<string, { old: unknown; new: unknown }>;
    comment: string | null;
    status: SuggestionStatus;
    createdAt: Date;
    contractor: {
        id: string;
        name: string;
        inn: string;
    };
    author: {
        id: string;
        name: string;
        avatar: string | null;
    };
}

interface MyClientsPageClientProps {
    initialContractors: ContractorData[];
    cities: string[];
    canCreate?: boolean;
    suggestions?: Suggestion[];
}

type TabType = "clients" | "suggestions";

export function MyClientsPageClient({
    initialContractors,
    cities,
    canCreate = false,
    suggestions = [],
}: MyClientsPageClientProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [cityFilter, setCityFilter] = useState<string>("all");
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get("tab") as TabType) || "clients";
    const initialSuggestionTab = (searchParams.get("suggestionTab") as "pending" | "approved" | "rejected") || "pending";

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [suggestionTab, setSuggestionTab] = useState<"pending" | "approved" | "rejected">(initialSuggestionTab);

    const updateTab = (tab: "pending" | "approved" | "rejected") => {
        setSuggestionTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set("suggestionTab", tab);

        router.replace(`?${params.toString()}`, { scroll: false });
    };


    useEffect(() => {

        const interval = setInterval(() => {
            router.refresh();
        }, 10000);


        const handleFocus = () => {
            router.refresh();
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
        };
    }, [router]);

    const pendingSuggestions = suggestions.filter(s => s.status === "PENDING");
    const approvedSuggestions = suggestions.filter(s => s.status === "APPROVED");
    const rejectedSuggestions = suggestions.filter(s => s.status === "REJECTED");

    const currentSuggestions = suggestionTab === "pending"
        ? pendingSuggestions
        : suggestionTab === "approved"
            ? approvedSuggestions
            : rejectedSuggestions;

    const filteredContractors = useMemo(() => {
        return initialContractors.filter((contractor) => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    contractor.name.toLowerCase().includes(query) ||
                    contractor.inn.includes(searchQuery) ||
                    contractor.primaryCity?.name.toLowerCase().includes(query);

                if (!matchesSearch) return false;
            }

            if (statusFilter !== "all" && contractor.status !== statusFilter) {
                return false;
            }

            if (cityFilter !== "all" && contractor.primaryCity?.name !== cityFilter) {
                return false;
            }

            return true;
        });
    }, [initialContractors, searchQuery, statusFilter, cityFilter]);

    const resetFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
        setCityFilter("all");
    };

    const hasActiveFilters =
        searchQuery || statusFilter !== "all" || cityFilter !== "all";

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Мои клиенты</h1>
                    <p className="text-muted-foreground">
                        Контрагенты, за которыми вы закреплены ({filteredContractors.length})
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


            <div className="flex gap-2 mb-6 border-b border-border">
                <button
                    onClick={() => setActiveTab("clients")}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "clients"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Users className="h-4 w-4" />
                    Контрагенты
                </button>
                <button
                    onClick={() => setActiveTab("suggestions")}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "suggestions"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <MessageSquare className="h-4 w-4" />
                    Предложения
                    {pendingSuggestions.length > 0 && (
                        <span className="min-w-[20px] h-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1.5">
                            {pendingSuggestions.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === "clients" && (
                <>

                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Поиск по названию, ИНН, городу..."
                                className="pl-10"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Статус" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все статусы</SelectItem>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={cityFilter} onValueChange={setCityFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Город" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все города</SelectItem>
                                {cities.map((city) => (
                                    <SelectItem key={city} value={city}>
                                        {city}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button variant="ghost" onClick={resetFilters} size="sm">
                                <X className="h-4 w-4 mr-2" />
                                Сбросить
                            </Button>
                        )}
                    </div>

                    {filteredContractors.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground text-lg">Контрагенты не найдены</p>
                            {hasActiveFilters ? (
                                <p className="text-muted-foreground mt-2">
                                    Попробуйте изменить параметры поиска
                                </p>
                            ) : (
                                <p className="text-muted-foreground mt-2">
                                    У вас пока нет закреплённых контрагентов
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredContractors.map((contractor) => (
                                <ContractorCard key={contractor.id} contractor={contractor} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === "suggestions" && (
                <div className="space-y-6">

                    <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
                        <button
                            onClick={() => updateTab("pending")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${suggestionTab === "pending"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Clock className="h-4 w-4 text-amber-500" />
                            Ожидают
                            {pendingSuggestions.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                                    {pendingSuggestions.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => updateTab("approved")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${suggestionTab === "approved"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            Принятые
                            {approvedSuggestions.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                                    {approvedSuggestions.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => updateTab("rejected")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${suggestionTab === "rejected"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Отклонённые
                            {rejectedSuggestions.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold">
                                    {rejectedSuggestions.length}
                                </span>
                            )}
                        </button>
                    </div>


                    {currentSuggestions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentSuggestions.map((suggestion) => (
                                <Link
                                    key={suggestion.id}
                                    href={`/suggestions/${suggestion.id}`}
                                    className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/50 transition-all group"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={suggestion.author.avatar || undefined} />
                                            <AvatarFallback>
                                                {suggestion.author.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                {suggestion.contractor.name}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">
                                                от {suggestion.author.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {new Date(suggestion.createdAt).toLocaleDateString("ru-RU")}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${suggestion.status === "PENDING"
                                            ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                                            : suggestion.status === "APPROVED"
                                                ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                                                : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                                            }`}>
                                            {Object.keys(suggestion.changes).length} изменений
                                        </span>
                                    </div>

                                    {suggestion.comment && (
                                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2 italic">
                                            "{suggestion.comment}"
                                        </p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground text-lg">
                                {suggestionTab === "pending"
                                    ? "Нет ожидающих предложений"
                                    : suggestionTab === "approved"
                                        ? "Нет принятых предложений"
                                        : "Нет отклонённых предложений"}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
