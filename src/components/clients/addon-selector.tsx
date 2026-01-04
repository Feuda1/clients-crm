"use client";

import * as React from "react";
import { Plus, X, Search } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Addon {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
}

interface AddonSelectorProps {
    allAddons: Addon[];
    selectedAddonIds: string[];
    onChange: (ids: string[]) => void;
    readOnly?: boolean;
}

export function AddonSelector({
    allAddons,
    selectedAddonIds,
    onChange,
    readOnly = false,
}: AddonSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedAddon, setSelectedAddon] = React.useState<Addon | null>(null);

    const addons = allAddons || [];
    const addonIds = selectedAddonIds || [];

    const selectedAddons = addons.filter((addon) =>
        addonIds.includes(addon.id)
    );

    const unselectedAddons = addons.filter(
        (addon) => !addonIds.includes(addon.id)
    );

    const filteredAddons = unselectedAddons.filter((addon) =>
        addon.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleAddon = (id: string) => {
        if (addonIds.includes(id)) {
            onChange(addonIds.filter((currentId) => currentId !== id));
        } else {
            onChange([...addonIds, id]);
        }
    };

    return (
        <>
            <div className="space-y-3">

                <div className="flex flex-wrap items-center gap-2">

                    {!readOnly && (
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-full border-dashed flex items-center gap-1 shrink-0"
                                >
                                    <Plus className="h-4 w-4" />
                                    Добавить
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-64" align="start">
                                <div className="flex items-center border-b px-3 pb-2 pt-2">
                                    <Search className="mr-2 h-4 w-4 opacity-50" />
                                    <Input
                                        placeholder="Поиск..."
                                        className="flex h-7 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none shadow-none focus-visible:ring-0"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1 text-sm">
                                    {filteredAddons.length === 0 ? (
                                        <div className="py-6 text-center text-muted-foreground text-xs">
                                            Ничего не найдено
                                        </div>
                                    ) : (
                                        filteredAddons.map((addon) => (
                                            <div
                                                key={addon.id}
                                                onClick={() => {
                                                    toggleAddon(addon.id);
                                                }}
                                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full mr-2"
                                                    style={{ backgroundColor: addon.color || "var(--muted)" }}
                                                />
                                                {addon.name}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}


                    {selectedAddons.map((addon) => (
                        <button
                            key={addon.id}
                            onClick={() => {
                                if (readOnly && addon.description) {
                                    setSelectedAddon(addon);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all max-w-[150px]",
                                readOnly && addon.description && "cursor-pointer hover:opacity-80"
                            )}
                            style={{
                                backgroundColor: addon.color ? `${addon.color}15` : "var(--muted)",
                                borderColor: addon.color ? `${addon.color}40` : "var(--border)",
                                color: addon.color || "var(--muted-foreground)",
                            }}
                        >
                            <span className="truncate">{addon.name}</span>
                            {!readOnly && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAddon(addon.id);
                                    }}
                                    className="ml-1 hover:text-destructive focus:outline-none shrink-0 cursor-pointer"
                                >
                                    <X className="h-3 w-3" />
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>


            <Dialog open={!!selectedAddon} onOpenChange={() => setSelectedAddon(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded-full shrink-0"
                                style={{ backgroundColor: selectedAddon?.color || "var(--muted)" }}
                            />
                            <DialogTitle>{selectedAddon?.name}</DialogTitle>
                        </div>
                    </DialogHeader>
                    <DialogDescription asChild>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <p className="text-base text-foreground whitespace-pre-wrap break-words">
                                {selectedAddon?.description || "Нет описания"}
                            </p>
                        </div>
                    </DialogDescription>
                </DialogContent>
            </Dialog>
        </>
    );
}
