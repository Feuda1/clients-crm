"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DictionaryItem {
    id: string;
    name: string;
}

interface DictionaryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: DictionaryItem | null;
    onSave: (data: { name: string }) => Promise<void>;
    singularName: string;
}

export function DictionaryDialog({
    open,
    onOpenChange,
    item,
    onSave,
    singularName
}: DictionaryDialogProps) {
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (item) {
            setName(item.name);
        } else {
            setName("");
        }
    }, [item, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave({ name });
            onOpenChange(false);
            setName("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const title = item ? `Редактировать ${singularName}` : `Добавить ${singularName}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Название</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Введите название..."
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
