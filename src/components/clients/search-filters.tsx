"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import type { ServiceStatus } from "@/generated/prisma/enums.js";
import { STATUS_LABELS, cn } from "@/lib/utils";

interface Manager {
    id: string;
    name: string;
}

interface Addon {
    id: string;
    name: string;
}

interface SearchFiltersProps {
    onSearch: (query: string) => void;
    onFilterChange: (filters: FilterState) => void;
    filters?: FilterState;
    managers?: Manager[];
    addons?: Addon[];
    cities?: string[];
}

export interface FilterState {
    status: ServiceStatus[];
    hasChain: boolean | null;
    city: string;
    managerId: string;
    addonIds: string[];
}

const statusOptions: ServiceStatus[] = [
    "ACTIVE",
    "LAUNCHING",
    "DEBT",
    "NO_CONTRACT",
    "SEASONAL",
    "LEFT",
    "CLOSED",
];

const STATUS_COLORS: Record<ServiceStatus, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    DEBT: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    LEFT: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    CLOSED: "bg-red-600/10 text-red-700 dark:text-red-400 border-red-600/20",
    NO_CONTRACT: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
    SEASONAL: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    LAUNCHING: "bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/20",
};

interface SearchableSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    searchPlaceholder: string;
}

function SearchableSelect({
    value,
    onValueChange,
    options,
    placeholder,
    searchPlaceholder,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-background border-input text-left font-normal"
                >
                    <span className={cn("truncate", !value && "text-muted-foreground")}>
                        {selectedLabel}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <div className="flex items-center border-b px-3 py-2">
                    <Search className="mr-2 h-4 w-4 opacity-50" />
                    <Input
                        placeholder={searchPlaceholder}
                        className="flex h-7 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground border-none shadow-none focus-visible:ring-0"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                    <div
                        onClick={() => {
                            onValueChange("");
                            setOpen(false);
                            setSearch("");
                        }}
                        className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            !value && "bg-accent"
                        )}
                    >
                        {placeholder}
                        {!value && <Check className="ml-auto h-4 w-4" />}
                    </div>
                    {filteredOptions.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                            Ничего не найдено
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => {
                                    onValueChange(option.value);
                                    setOpen(false);
                                    setSearch("");
                                }}
                                className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    value === option.value && "bg-accent"
                                )}
                            >
                                {option.label}
                                {value === option.value && <Check className="ml-auto h-4 w-4" />}
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function SearchFilters({
    onSearch,
    onFilterChange,
    filters: propFilters,
    managers = [],
    addons = [],
    cities = [],
}: SearchFiltersProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [addonSearch, setAddonSearch] = useState("");
    const filterRef = useRef<HTMLDivElement>(null);

    const [localFilters, setLocalFilters] = useState<FilterState>({
        status: [],
        hasChain: null,
        city: "",
        managerId: "",
        addonIds: [],
    });

    const isControlled = propFilters !== undefined;
    const filters = isControlled ? propFilters : localFilters;

    console.log("SearchFilters Debug:", {
        isControlled,
        hasPropFilters: propFilters !== undefined,
        propFiltersStatus: propFilters?.status,
        currentFiltersStatus: filters.status
    });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowFilters(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        onSearch(value);
    };

    const toggleStatus = (status: ServiceStatus) => {
        const newStatuses = filters.status.includes(status)
            ? filters.status.filter((s) => s !== status)
            : [...filters.status, status];
        const newFilters = { ...filters, status: newStatuses };

        if (!isControlled) {
            setLocalFilters(newFilters);
        }
        onFilterChange(newFilters);
    };

    const toggleAddon = (addonId: string) => {
        const newAddonIds = filters.addonIds.includes(addonId)
            ? filters.addonIds.filter((id) => id !== addonId)
            : [...filters.addonIds, addonId];
        const newFilters = { ...filters, addonIds: newAddonIds };

        if (!isControlled) {
            setLocalFilters(newFilters);
        }
        onFilterChange(newFilters);
    };

    const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        const newFilters = { ...filters, [key]: value };

        if (!isControlled) {
            setLocalFilters(newFilters);
        }
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const newFilters: FilterState = {
            status: [],
            hasChain: null,
            city: "",
            managerId: "",
            addonIds: [],
        };

        if (!isControlled) {
            setLocalFilters(newFilters);
        }
        onFilterChange(newFilters);
    };

    const activeFiltersCount =
        filters.status.length +
        (filters.hasChain !== null ? 1 : 0) +
        (filters.city ? 1 : 0) +
        (filters.managerId ? 1 : 0) +
        filters.addonIds.length;

    const filteredAddons = addons.filter(addon =>
        addon.name.toLowerCase().includes(addonSearch.toLowerCase())
    );

    return (
        <div className="relative space-y-4" ref={filterRef}>

            <div className="flex gap-3 relative z-20">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Поиск по названию, ИНН, городу, контрагенту..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10 bg-background text-foreground border-input focus-visible:ring-ring focus-visible:text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "gap-2 border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                        showFilters && "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    )}
                >
                    <Filter className="w-4 h-4" />
                    Фильтры
                    {activeFiltersCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                            {activeFiltersCount}
                        </span>
                    )}
                    {showFilters ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                    ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                </Button>
            </div>


            {showFilters && (
                <div className="mt-2 relative z-10 bg-card rounded-xl border border-border shadow-sm p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                        <div className="lg:col-span-8 space-y-6">

                            <div>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                    Статус клиента
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {statusOptions.map((status) => {
                                        const isSelected = filters.status.includes(status);
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => toggleStatus(status)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                                                    isSelected
                                                        ? STATUS_COLORS[status] + " ring-1 ring-inset"
                                                        : "border-input bg-card/50 text-muted-foreground hover:border-accent-foreground/20 hover:text-foreground"
                                                )}
                                            >
                                                {STATUS_LABELS[status]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {managers.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                            Менеджер
                                        </h4>
                                        <SearchableSelect
                                            value={filters.managerId}
                                            onValueChange={(v) => updateFilter("managerId", v)}
                                            options={managers.map(m => ({ value: m.id, label: m.name }))}
                                            placeholder="Все менеджеры"
                                            searchPlaceholder="Поиск менеджера..."
                                        />
                                    </div>
                                )}


                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Город
                                    </h4>
                                    {cities.length > 0 ? (
                                        <SearchableSelect
                                            value={filters.city}
                                            onValueChange={(v) => updateFilter("city", v)}
                                            options={cities.map(city => ({ value: city, label: city }))}
                                            placeholder="Все города"
                                            searchPlaceholder="Поиск города..."
                                        />
                                    ) : (
                                        <Input
                                            placeholder="Введите город"
                                            value={filters.city}
                                            onChange={(e) => updateFilter("city", e.target.value)}
                                            className="bg-background border-input"
                                        />
                                    )}
                                </div>
                            </div>


                            <div>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                    Есть Chain?
                                </h4>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateFilter("hasChain", filters.hasChain === true ? null : true)}
                                        className={cn(
                                            "border-input min-w-[3rem]",
                                            filters.hasChain === true
                                                ? "bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400"
                                                : "bg-card/50 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Да
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateFilter("hasChain", filters.hasChain === false ? null : false)}
                                        className={cn(
                                            "border-input min-w-[3rem]",
                                            filters.hasChain === false
                                                ? "bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400"
                                                : "bg-card/50 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Нет
                                    </Button>
                                </div>
                            </div>
                        </div>


                        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6 flex flex-col h-full">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                Дополнения
                            </h4>

                            <div className="relative mb-3">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Поиск дополнений..."
                                    value={addonSearch}
                                    onChange={(e) => setAddonSearch(e.target.value)}
                                    className="pl-8 h-9 text-sm bg-background border-input"
                                />
                            </div>

                            <div className="bg-card/50 rounded-lg border border-border p-1 flex-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                                {filteredAddons.length > 0 ? (
                                    <div className="space-y-0.5">
                                        {filteredAddons.map((addon) => {
                                            const isSelected = filters.addonIds.includes(addon.id);
                                            return (
                                                <label
                                                    key={addon.id}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm",
                                                        isSelected
                                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                            : "hover:bg-accent text-muted-foreground hover:text-accent-foreground"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                        isSelected
                                                            ? "bg-blue-600 border-blue-600 text-white"
                                                            : "border-input bg-transparent"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3" />}
                                                    </div>


                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={isSelected}
                                                        onChange={() => toggleAddon(addon.id)}
                                                    />

                                                    <span className="flex-1 truncate">{addon.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        Не найдено
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {activeFiltersCount > 0 && (
                        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                Выбрано фильтров: <span className="text-foreground font-medium">{activeFiltersCount}</span>
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Сбросить все
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
