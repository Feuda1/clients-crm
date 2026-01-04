"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Tag } from "lucide-react";
import { AddonDialog } from "./addon-dialog";
import { hasPermission } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

interface Addon {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
}

export function AddonList() {
    const { data: session } = useSession();
    const [addons, setAddons] = useState<Addon[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
    const [addonToDelete, setAddonToDelete] = useState<Addon | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const canManage = session?.user?.permissions && hasPermission(session.user.permissions, "MANAGE_ADDONS");

    const fetchAddons = async () => {
        try {
            const res = await fetch("/api/addons");
            if (res.ok) {
                const data = await res.json();
                setAddons(data);
            }
        } catch (error) {
            console.error("Ошибка загрузки дополнений", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAddons();
    }, []);

    const filteredAddons = addons.filter(addon =>
        addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (addon.description && addon.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleCreate = async (data: Partial<Addon>) => {
        const res = await fetch("/api/addons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (res.ok) {
            fetchAddons();
        }
    };

    const handleUpdate = async (data: Partial<Addon>) => {
        if (!editingAddon) return;

        const res = await fetch(`/api/addons/${editingAddon.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (res.ok) {
            fetchAddons();
        }
    };

    const handleDeleteClick = (addon: Addon) => {
        setAddonToDelete(addon);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!addonToDelete) return;

        const res = await fetch(`/api/addons/${addonToDelete.id}`, {
            method: "DELETE",
        });

        if (res.ok) {
            fetchAddons();
        }
        setIsDeleteDialogOpen(false);
        setAddonToDelete(null);
    };

    const openCreateDialog = () => {
        setEditingAddon(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (addon: Addon) => {
        setEditingAddon(addon);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Список дополнений</h2>
                    <p className="text-muted-foreground text-sm">Услуги и модули, подключаемые к клиентам</p>
                </div>
                {canManage && (
                    <Button onClick={openCreateDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Новое дополнение
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Поиск по названию..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAddons.map((addon) => (
                    <div
                        key={addon.id}
                        className="flex items-center justify-between p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                            <div
                                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                    backgroundColor: addon.color ? `${addon.color}20` : "var(--muted)",
                                    color: addon.color || "var(--muted-foreground)"
                                }}
                            >
                                <Tag className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold truncate">{addon.name}</h3>
                                {addon.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 break-all">{addon.description}</p>
                                )}
                            </div>
                        </div>
                        {canManage && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(addon)}>
                                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(addon)}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}

                {filteredAddons.length === 0 && !isLoading && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Ничего не найдено
                    </div>
                )}
            </div>

            <AddonDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                addon={editingAddon}
                onSave={editingAddon ? handleUpdate : handleCreate}
            />

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить дополнение?</DialogTitle>
                        <DialogDescription>
                            Вы действительно хотите удалить "{addonToDelete?.name}"? Это действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
