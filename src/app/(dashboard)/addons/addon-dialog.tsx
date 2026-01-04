"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Addon {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
}

interface AddonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    addon?: Addon | null;
    onSave: (addon: Partial<Addon>) => Promise<void>;
}

export function AddonDialog({ open, onOpenChange, addon, onSave }: AddonDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState("#000000");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (addon) {
            setName(addon.name);
            setDescription(addon.description || "");
            setColor(addon.color || "#000000");
        } else {
            setName("");
            setDescription("");
            setColor("#3b82f6");
        }
    }, [addon, open]);

    const handleSave = async () => {
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            await onSave({ name, description, color });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{addon ? "Редактировать дополнение" : "Создать дополнение"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Название</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Например: ЕГАИС"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Описание</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Краткое описание..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="color">Цвет (HEX)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="color"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-12 p-1 h-10"
                            />
                            <Input
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                placeholder="#000000"
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Отмена
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? "Сохранение..." : "Сохранить"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
