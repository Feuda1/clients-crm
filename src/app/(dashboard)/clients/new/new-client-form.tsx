"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Building2, FileText, Rocket, Paperclip, X, Upload } from "lucide-react";
import { STATUS_LABELS } from "@/lib/utils";
import { AddonSelector } from "@/components/clients/addon-selector";
import { Combobox } from "@/components/ui/combobox";

interface User {
    id: string;
    name: string;
}

interface NewClientFormProps {
    users: User[];
    addons: { id: string; name: string; color: string | null; description: string | null }[];
    cities: { id: string; name: string }[];
    agreements: { id: string; name: string }[];
    currentUserId: string;
}

import { useRef } from "react";

export function NewClientForm({ users, addons, cities, agreements, currentUserId }: NewClientFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        inn: "",
        contractor: "",
        cityId: "",
        city: "",
        agreementId: "",
        contractType: "",
        status: "ACTIVE",
        frontsCount: 0,
        frontsOnService: 0,
        hasChain: false,
        notes: "",
        description: "",
        individualTerms: "",
        managerId: currentUserId,
        addons: [] as string[],
    });

    const cityItems = cities.map(c => ({ value: c.id, label: c.name }));
    const agreementItems = agreements.map(a => ({ value: a.id, label: a.name }));
    const managerItems = users.map(u => ({ value: u.id, label: u.name }));

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);


        const selectedCity = cities.find(c => c.id === formData.cityId);
        const selectedAgreement = agreements.find(a => a.id === formData.agreementId);

        const payload = {
            ...formData,
            city: selectedCity ? selectedCity.name : formData.city,
            contractType: selectedAgreement ? selectedAgreement.name : (formData.contractType || "Стандартный"),
        };

        try {
            const response = await fetch("/api/clients", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при создании клиента");
            }

            const newClient = await response.json();


            if (files.length > 0) {
                const uploadPromises = files.map(async (file) => {
                    const formData = new FormData();
                    formData.append("files", file);
                    await fetch(`/api/clients/${newClient.id}/files`, {
                        method: "POST",
                        body: formData,
                    });
                });
                await Promise.all(uploadPromises);
            }

            router.push("/clients");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Произошла ошибка");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                </Button>
                <h1 className="text-2xl font-bold text-foreground">Новый клиент</h1>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        О компании
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Название <span className="text-destructive">*</span>
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ресторан Премиум"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Контрагент <span className="text-destructive">*</span>
                            </label>
                            <Input
                                value={formData.contractor}
                                onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                                placeholder="ООО Премиум Фуд"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                ИНН <span className="text-destructive">*</span>
                            </label>
                            <Input
                                value={formData.inn}
                                onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                                placeholder="7701234567"
                                required
                            />
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <label className="text-sm font-medium text-foreground">
                                Город <span className="text-destructive">*</span>
                            </label>
                            <Combobox
                                items={cityItems}
                                value={formData.cityId}
                                onSelect={(val) => setFormData({ ...formData, cityId: val })}
                                placeholder="Выберите город..."
                                searchPlaceholder="Поиск города..."
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>


                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Договор и Менеджмент
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Статус
                            </label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <label className="text-sm font-medium text-foreground">
                                Менеджер <span className="text-destructive">*</span>
                            </label>
                            <Combobox
                                items={managerItems}
                                value={formData.managerId}
                                onSelect={(val) => setFormData({ ...formData, managerId: val })}
                                placeholder="Выберите менеджера..."
                                searchPlaceholder="Поиск менеджера..."
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <label className="text-sm font-medium text-foreground">
                                Тип договора
                            </label>
                            <Combobox
                                items={agreementItems}
                                value={formData.agreementId}
                                onSelect={(val) => setFormData({ ...formData, agreementId: val })}
                                placeholder="Выберите тип договора..."
                                searchPlaceholder="Поиск договора..."
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>


                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Rocket className="h-5 w-5 text-primary" />
                        Параметры обслуживания
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Общее кол-во фронтов
                            </label>
                            <Input
                                type="number"
                                min={0}
                                value={formData.frontsCount || ""}
                                placeholder="0"
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setFormData(prev => ({
                                        ...prev,
                                        frontsCount: val,
                                        // Если значения совпадали, обновляем и второе поле
                                        frontsOnService: prev.frontsCount === prev.frontsOnService ? val : prev.frontsOnService
                                    }));
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Фронты на обслуживании
                            </label>
                            <Input
                                type="number"
                                min={0}
                                value={formData.frontsOnService || ""}
                                placeholder="0"
                                onChange={(e) => setFormData({ ...formData, frontsOnService: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 h-10">
                        <Checkbox
                            id="hasChain"
                            checked={formData.hasChain}
                            onCheckedChange={(checked) => setFormData({ ...formData, hasChain: checked as boolean })}
                        />
                        <label htmlFor="hasChain" className="text-sm text-foreground cursor-pointer select-none">
                            Сетевой клиент (Chain)
                        </label>
                    </div>
                </div>


                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Дополнения
                    </h2>
                    <AddonSelector
                        allAddons={addons}
                        selectedAddonIds={formData.addons}
                        onChange={(ids) => setFormData({ ...formData, addons: ids })}
                    />
                </div>


                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Детали
                    </h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Индивидуальные условия
                            </label>
                            <Textarea
                                value={formData.individualTerms}
                                onChange={(e) => setFormData({ ...formData, individualTerms: e.target.value })}
                                placeholder="Особые условия сотрудничества..."
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Примечания
                            </label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Важные заметки (будут выделены цветом)..."
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Описание
                            </label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Подробное описание клиента..."
                                rows={4}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-primary" />
                        Файлы
                    </h2>
                    <div className="space-y-4">
                        {files.length > 0 && (
                            <div className="space-y-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-border">
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                            <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(index)}
                                            className="h-8 w-8 p-0 hover:text-destructive"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleFileSelect}
                        />

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:bg-accent/50 transition-colors cursor-pointer group"
                        >
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                Нажмите для загрузки файлов или перетащите их сюда
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Отмена
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="min-w-[140px]"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Сохранение..." : "Создать клиента"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
