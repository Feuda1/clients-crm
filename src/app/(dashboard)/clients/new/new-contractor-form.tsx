"use client";

import { useState, useRef } from "react";
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
import {
    ArrowLeft,
    Save,
    Building2,
    Store,
    FileText,
    Paperclip,
    X,
    Upload,
    Plus,
    Trash2,
    Link as LinkIcon
} from "lucide-react";
import { STATUS_LABELS } from "@/lib/utils";
import { AddonSelector } from "@/components/clients/addon-selector";
import { Combobox } from "@/components/ui/combobox";

interface User {
    id: string;
    name: string;
}

interface NewContractorFormProps {
    users: User[];
    addons: { id: string; name: string; color: string | null; description: string | null }[];
    cities: { id: string; name: string }[];
    agreements: { id: string; name: string }[];
    currentUserId: string;
}

interface ServicePointFormData {
    name: string;
    address: string;
    cityId: string;
    frontsCount: number;
    frontsOnService: number;
    description: string;
    notes: string;
    individualTerms: string;
    addons: string[];
}

export function NewContractorForm({ users, addons, cities, agreements, currentUserId }: NewContractorFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);


    const [contractorData, setContractorData] = useState({
        name: "",
        inn: "",
        status: "ACTIVE",
        hasChain: false,
        primaryCityId: "",
        agreementId: "",
        managerId: currentUserId,
        generalDescription: "",
        generalNotes: "",
        generalIndividualTerms: "",
    });


    const [servicePoints, setServicePoints] = useState<ServicePointFormData[]>([{
        name: "",
        address: "",
        cityId: "",
        frontsCount: 1,
        frontsOnService: 1,
        description: "",
        notes: "",
        individualTerms: "",
        addons: [],
    }]);

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

    const addServicePoint = () => {
        setServicePoints(prev => [...prev, {
            name: "",
            address: "",
            cityId: contractorData.primaryCityId,
            frontsCount: 1,
            frontsOnService: 1,
            description: "",
            notes: "",
            individualTerms: "",
            addons: [],
        }]);
    };

    const removeServicePoint = (index: number) => {
        if (servicePoints.length > 1) {
            setServicePoints(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateServicePoint = (index: number, data: Partial<ServicePointFormData>) => {
        setServicePoints(prev => prev.map((sp, i) => i === index ? { ...sp, ...data } : sp));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);


        if (servicePoints.length === 0) {
            setError("Добавьте хотя бы одну точку обслуживания");
            setIsLoading(false);
            return;
        }


        const invalidPoints = servicePoints.filter(sp => !sp.name.trim());
        if (invalidPoints.length > 0) {
            setError("Все точки обслуживания должны иметь название");
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                ...contractorData,
                servicePoints: servicePoints.map(sp => ({
                    name: sp.name,
                    address: sp.address || null,
                    cityId: sp.cityId || null,
                    frontsCount: sp.frontsCount,
                    frontsOnService: sp.frontsOnService,
                    description: sp.description || null,
                    notes: sp.notes || null,
                    individualTerms: sp.individualTerms || null,
                    addons: sp.addons,
                })),
            };

            const response = await fetch("/api/contractors", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при создании контрагента");
            }

            const newContractor = await response.json();


            if (files.length > 0) {
                const formData = new FormData();
                files.forEach(file => {
                    formData.append("files", file);
                });
                await fetch(`/api/contractors/${newContractor.id}/files`, {
                    method: "POST",
                    body: formData,
                });
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
        <div className="p-6 max-w-3xl mx-auto">
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
                <h1 className="text-2xl font-bold text-foreground">Новый контрагент</h1>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="bg-card rounded-xl border border-border p-5">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Данные контрагента
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-medium text-foreground">Название контрагента *</label>
                            <Input
                                value={contractorData.name}
                                onChange={(e) => setContractorData({ ...contractorData, name: e.target.value })}
                                placeholder="ООО 'Название'"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">ИНН *</label>
                            <Input
                                value={contractorData.inn}
                                onChange={(e) => setContractorData({ ...contractorData, inn: e.target.value })}
                                placeholder="7701234567"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Статус</label>
                            <Select
                                value={contractorData.status}
                                onValueChange={(v) => setContractorData({ ...contractorData, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Основной город</label>
                            <Combobox
                                items={cityItems}
                                value={contractorData.primaryCityId}
                                onSelect={(val) => setContractorData({ ...contractorData, primaryCityId: val })}
                                placeholder="Выберите город..."
                                searchPlaceholder="Поиск города..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Тип договора</label>
                            <Combobox
                                items={agreementItems}
                                value={contractorData.agreementId}
                                onSelect={(val) => setContractorData({ ...contractorData, agreementId: val })}
                                placeholder="Выберите тип..."
                                searchPlaceholder="Поиск..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Менеджер</label>
                            <Combobox
                                items={managerItems}
                                value={contractorData.managerId}
                                onSelect={(val) => setContractorData({ ...contractorData, managerId: val })}
                                placeholder="Выберите менеджера..."
                                searchPlaceholder="Поиск..."
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-4">
                            <Checkbox
                                id="hasChain"
                                checked={contractorData.hasChain}
                                onCheckedChange={(c) => setContractorData({ ...contractorData, hasChain: c as boolean })}
                            />
                            <label htmlFor="hasChain" className="text-sm text-foreground cursor-pointer select-none flex items-center gap-1.5">
                                <LinkIcon className="h-4 w-4 text-purple-500" />
                                Сетевой клиент (Chain)
                            </label>
                        </div>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Общее описание</label>
                            <Textarea
                                value={contractorData.generalDescription}
                                onChange={(e) => setContractorData({ ...contractorData, generalDescription: e.target.value })}
                                placeholder="Описание контрагента..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Примечания</label>
                            <Textarea
                                value={contractorData.generalNotes}
                                onChange={(e) => setContractorData({ ...contractorData, generalNotes: e.target.value })}
                                placeholder="Важные заметки..."
                                rows={2}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">Общие индивидуальные условия</label>
                            <Textarea
                                value={contractorData.generalIndividualTerms}
                                onChange={(e) => setContractorData({ ...contractorData, generalIndividualTerms: e.target.value })}
                                placeholder="Особые условия договора..."
                                rows={2}
                            />
                        </div>
                    </div>
                </div>


                <div className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Store className="h-5 w-5" />
                            Точки обслуживания ({servicePoints.length})
                        </h2>
                        <Button type="button" variant="outline" size="sm" onClick={addServicePoint}>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить точку
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {servicePoints.map((sp, index) => (
                            <div key={index} className="border border-border rounded-lg p-4 bg-muted/20">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-foreground">Точка #{index + 1}</h3>
                                    {servicePoints.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeServicePoint(index)}
                                            className="text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-foreground">Название точки *</label>
                                        <Input
                                            value={sp.name}
                                            onChange={(e) => updateServicePoint(index, { name: e.target.value })}
                                            placeholder="Магазин на ул. Ленина"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">Адрес</label>
                                        <Input
                                            value={sp.address}
                                            onChange={(e) => updateServicePoint(index, { address: e.target.value })}
                                            placeholder="ул. Ленина, д. 1"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">Город</label>
                                        <Combobox
                                            items={cityItems}
                                            value={sp.cityId}
                                            onSelect={(val) => updateServicePoint(index, { cityId: val })}
                                            placeholder="Выберите город..."
                                            searchPlaceholder="Поиск города..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">Кол-во фронтов</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={sp.frontsCount || ""}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                updateServicePoint(index, {
                                                    frontsCount: val,
                                                    frontsOnService: sp.frontsCount === sp.frontsOnService ? val : sp.frontsOnService
                                                });
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground">На обслуживании</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={sp.frontsOnService || ""}
                                            onChange={(e) => updateServicePoint(index, {
                                                frontsOnService: Math.max(0, parseInt(e.target.value) || 0)
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-foreground">Дополнения для этой точки</label>
                                        <AddonSelector
                                            allAddons={addons}
                                            selectedAddonIds={sp.addons}
                                            onChange={(ids) => updateServicePoint(index, { addons: ids })}
                                        />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-foreground">Примечания к точке</label>
                                        <Input
                                            value={sp.notes}
                                            onChange={(e) => updateServicePoint(index, { notes: e.target.value })}
                                            placeholder="Заметки..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


                <div className="bg-card rounded-xl border border-border p-5">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Paperclip className="h-5 w-5" />
                        Файлы контрагента
                    </h2>

                    {files.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="relative rounded-lg border-2 border-dashed border-blue-500/50 overflow-hidden bg-blue-500/5 p-3"
                                >
                                    <p className="text-sm truncate text-foreground">{file.name}</p>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="absolute top-1 right-1 p-1 rounded bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
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
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-dashed"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Добавить файлы
                    </Button>
                </div>


                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Отмена
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Создание..." : "Создать контрагента"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
