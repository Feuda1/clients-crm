"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, BookOpen } from "lucide-react";
import { DictionaryDialog } from "./dictionary-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

interface DictionaryItem {
    id: string;
    name: string;
}

interface DictionaryListProps {
    title: string;
    description: string;
    endpoint: string;
    singularName: string;
    canManage?: boolean;
}

export function DictionaryList({ title, description, endpoint, singularName, canManage = false }: DictionaryListProps) {
    const [items, setItems] = useState<DictionaryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<DictionaryItem | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [showForceOption, setShowForceOption] = useState(false);

    const fetchItems = async () => {
        try {
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error("Ошибка загрузки элементов", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [endpoint]);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = async (data: { name: string }) => {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (res.ok) fetchItems();
    };

    const handleUpdate = async (data: { name: string }) => {
        if (!editingItem) return;
        const res = await fetch(`${endpoint}/${editingItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (res.ok) fetchItems();
    };

    const handleDelete = async (force: boolean = false) => {
        if (!itemToDelete) return;

        const url = force ? `${endpoint}/${itemToDelete.id}?force=true` : `${endpoint}/${itemToDelete.id}`;

        const res = await fetch(url, {
            method: "DELETE",
        });

        if (res.ok) {
            fetchItems();
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
            setDeleteError(null);
            setShowForceOption(false);
        } else {
            const data = await res.json();
            setDeleteError(data.error || "Ошибка при удалении");

            if (res.status === 400 && endpoint !== "/api/addons") {
                setShowForceOption(true);
            }
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: DictionaryItem) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="text-muted-foreground text-sm">{description}</p>
                </div>
                {canManage && (
                    <Button onClick={openCreateDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить {singularName}
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Поиск..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold truncate">{item.name}</h3>
                        </div>
                        {canManage && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                    setItemToDelete(item);
                                    setDeleteError(null);
                                    setShowForceOption(false);
                                    setIsDeleteDialogOpen(true);
                                }}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
                {filteredItems.length === 0 && !isLoading && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Ничего не найдено
                    </div>
                )}
            </div>

            <DictionaryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                item={editingItem}
                onSave={editingItem ? handleUpdate : handleCreate}
                singularName={singularName}
            />

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить элемент?</DialogTitle>
                        <DialogDescription>
                            Вы действительно хотите удалить "{itemToDelete?.name}"?
                            Это действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>

                    {deleteError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                            {deleteError}
                            {showForceOption && (
                                <p className="mt-2 text-xs font-medium">
                                    Вы можете принудительно удалить этот элемент. В этом случае он будет удален из всех связанных записей (поле будет очищено).
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Отмена
                        </Button>
                        {showForceOption ? (
                            <Button variant="destructive" onClick={() => handleDelete(true)}>
                                Удалить все равно
                            </Button>
                        ) : (
                            <Button variant="destructive" onClick={() => handleDelete(false)}>
                                Удалить
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
