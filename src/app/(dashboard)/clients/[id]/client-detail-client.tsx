"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    ArrowLeft,
    Save,
    Pencil,
    X,
    Building2,
    MapPin,
    User,
    FileText,
    Calendar,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Leaf,
    Rocket,
    AlertTriangle,
    Paperclip,
    Download,
    Eye,
    Trash2,
    Upload,
    Image,
    Film,
    Link as LinkIcon,
    MessageSquarePlus,
    Send,
    RotateCcw,
} from "lucide-react";
import { AddonSelector } from "@/components/clients/addon-selector";
import { STATUS_LABELS, hasPermission, cn } from "@/lib/utils";
import type { ServiceStatus } from "@/generated/prisma/enums.js";
import { Combobox } from "@/components/ui/combobox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { FilePreviewDialog } from "@/components/files/file-preview-dialog";

interface Client {
    id: string;
    contractType: string;
    agreementId: string | null;
    inn: string;
    contractor: string;
    name: string;
    hasChain: boolean;
    status: ServiceStatus;
    city: string;
    cityId: string | null;
    frontsCount: number;
    frontsOnService: number;
    individualTerms: string | null;
    description: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    manager: { id: string; name: string; avatar: string | null } | null;
    createdBy: { id: string; name: string };
    addons: Array<{ addon: { id: string; name: string; color: string | null } }>;
    files: Array<{
        id: string;
        filename: string;
        storagePath: string;
        fileType: string;
        mimeType?: string;
        size?: number;
        createdAt: Date;
    }>;
}

interface UserType {
    id: string;
    name: string;
}

interface Addon {
    id: string;
    name: string;
    color: string | null;
    description: string | null;
}

interface ClientDetailClientProps {
    client: Client;
    users: UserType[];
    allAddons: Addon[];
    cities: { id: string; name: string }[];
    agreements: { id: string; name: string }[];
    currentUserId: string;
    userPermissions: string[];
}


const STATUS_CONFIG: Record<ServiceStatus, { icon: React.ElementType; color: string; bg: string; border: string }> = {
    ACTIVE: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    DEBT: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
    LEFT: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
    CLOSED: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
    NO_CONTRACT: { icon: AlertCircle, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" },
    SEASONAL: { icon: Leaf, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30" },
    LAUNCHING: { icon: Rocket, color: "text-lime-400", bg: "bg-lime-500/10", border: "border-lime-500/30" },
};

export function ClientDetailClient({
    client,
    users,
    allAddons,
    cities,
    agreements,
    currentUserId,
    userPermissions,
}: ClientDetailClientProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestionComment, setSuggestionComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const canEdit =
        hasPermission(userPermissions, "ADMIN") ||
        hasPermission(userPermissions, "EDIT_ALL_CLIENTS") ||
        (hasPermission(userPermissions, "EDIT_OWN_CLIENT") &&
            (client.createdBy?.id === currentUserId ||
                client.manager?.id === currentUserId));

    const [clientData, setClientData] = useState(client);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);


    const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set());
    const [previewFile, setPreviewFile] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: client.name,
        inn: client.inn,
        contractor: client.contractor,
        cityId: client.cityId || "",
        city: client.city,
        contractType: client.contractType,
        agreementId: client.agreementId || "",
        status: client.status,
        frontsCount: client.frontsCount,
        frontsOnService: typeof client.frontsOnService === 'number' ? client.frontsOnService : 0,
        hasChain: client.hasChain,
        notes: client.notes || "",
        description: client.description || "",
        individualTerms: client.individualTerms || "",
        managerId: client.manager?.id || "",
        addons: client.addons.map(a => a.addon.id),
    });

    const cityItems = cities.map(c => ({ value: c.id, label: c.name }));
    const agreementItems = agreements.map(a => ({ value: a.id, label: a.name }));
    const managerItems = users.map(u => ({ value: u.id, label: u.name }));

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const toggleFileDeletion = (fileId: string) => {
        setFilesToDelete(prev => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }
            return next;
        });
    };

    const uploadFiles = async (isPending: boolean = false): Promise<any[]> => {
        if (selectedFiles.length === 0) return [];

        const formDataFiles = new FormData();
        selectedFiles.forEach(file => {
            formDataFiles.append("files", file);
        });

        if (isPending) {
            formDataFiles.append("isPending", "true");
        }

        const response = await fetch(`/api/clients/${client.id}/files`, {
            method: "POST",
            body: formDataFiles,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Ошибка при загрузке файлов");
        }

        return await response.json();
    };


    const deleteFile = async (fileId: string) => {
        try {
            const response = await fetch(`/api/clients/${client.id}/files`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId }),
            });

            if (!response.ok) {
                throw new Error("Ошибка при удалении файла");
            }

            setClientData(prev => ({
                ...prev,
                files: prev.files.filter(f => f.id !== fileId),
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка удаления файла");
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const uploadedFiles = await uploadFiles(false);


            const selectedCity = cities.find(c => c.id === formData.cityId);
            const selectedAgreement = agreements.find(a => a.id === formData.agreementId);

            const payload = {
                ...formData,
                city: selectedCity ? selectedCity.name : formData.city,
                contractType: selectedAgreement ? selectedAgreement.name : formData.contractType,
            };


            const response = await fetch(`/api/clients/${client.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при сохранении");
            }

            const updatedClient = await response.json();


            setClientData(prev => ({
                ...updatedClient,
                files: [...uploadedFiles, ...prev.files],
            }));
            setSelectedFiles([]);
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Произошла ошибка");
        } finally {
            setIsLoading(false);
        }
    };


    const handleSubmitSuggestion = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {

            let addedFileIds: string[] = [];
            if (selectedFiles.length > 0) {
                const uploadedPendingFiles = await uploadFiles(true);
                addedFileIds = uploadedPendingFiles.map(f => f.id);
            }


            const changes: Record<string, { old: unknown; new: unknown }> = {};

            const fieldsToCompare = [
                { key: "name", label: "Название" },
                { key: "inn", label: "ИНН" },
                { key: "contractor", label: "Контрагент" },
                { key: "city", label: "Город" },
                { key: "contractType", label: "Тип договора" },
                { key: "status", label: "Статус" },
                { key: "frontsCount", label: "Кол-во фронтов" },
                { key: "frontsOnService", label: "На обслуживании" },
                { key: "hasChain", label: "Chain" },
                { key: "notes", label: "Примечания" },
                { key: "description", label: "Описание" },
                { key: "individualTerms", label: "Индивидуальные условия" },
            ];

            for (const field of fieldsToCompare) {
                const oldValue = clientData[field.key as keyof typeof clientData];
                const newValue = formData[field.key as keyof typeof formData];

                if (oldValue !== newValue) {
                    changes[field.key] = { old: oldValue, new: newValue };
                }
            }


            if (addedFileIds.length > 0 || filesToDelete.size > 0) {
                changes["files"] = {
                    old: null,
                    new: {
                        added: addedFileIds,
                        removed: Array.from(filesToDelete)
                    }
                };
            }

            if (Object.keys(changes).length === 0) {
                setError("Нет изменений для предложения");
                setIsLoading(false);
                return;
            }

            const response = await fetch("/api/suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: client.id,
                    changes,
                    comment: suggestionComment || undefined,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при отправке предложения");
            }

            setSuccessMessage("Предложение отправлено менеджеру!");
            setIsSuggesting(false);
            setSuggestionComment("");
            setSelectedFiles([]);
            setFilesToDelete(new Set());


            setFormData({
                name: clientData.name,
                inn: clientData.inn,
                contractor: clientData.contractor,
                cityId: clientData.cityId || "",
                city: clientData.city,
                contractType: clientData.contractType,
                agreementId: clientData.agreementId || "",
                status: clientData.status,
                frontsCount: clientData.frontsCount,
                frontsOnService: typeof clientData.frontsOnService === 'number' ? clientData.frontsOnService : 0,
                hasChain: clientData.hasChain,
                notes: clientData.notes || "",
                description: clientData.description || "",
                individualTerms: clientData.individualTerms || "",
                managerId: clientData.manager?.id || "",
                addons: clientData.addons.map(a => a.addon.id),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Произошла ошибка");
        } finally {
            setIsLoading(false);
        }
    };


    const currentStatus = isEditing ? formData.status : clientData.status;
    const statusConfig = STATUS_CONFIG[currentStatus];
    const StatusIcon = statusConfig.icon;

    return (
        <div className="p-6 max-w-4xl mx-auto">

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Назад
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsEditing(false);
                                    setSelectedFiles([]);
                                }}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Отмена
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isLoading}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {isLoading ? "Сохранение..." : "Сохранить"}
                            </Button>
                        </>
                    ) : isSuggesting ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsSuggesting(false);
                                    setSuggestionComment("");
                                    setSelectedFiles([]);
                                    setFilesToDelete(new Set());
                                }}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Отмена
                            </Button>
                            <Button
                                onClick={handleSubmitSuggestion}
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                {isLoading ? "Отправка..." : "Отправить предложение"}
                            </Button>
                        </>
                    ) : (
                        <>
                            {canEdit ? (
                                <Button
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Редактировать
                                </Button>
                            ) : hasPermission(userPermissions, "SUGGEST_EDITS") ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setIsSuggesting(true)}
                                    className="border-blue-500/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                >
                                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                                    Предложить исправление
                                </Button>
                            ) : null}
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                    {successMessage}
                </div>
            )}


            {isSuggesting && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <label className="text-sm font-medium text-blue-600 dark:text-blue-400 block mb-2">
                        Комментарий к предложению (необязательно)
                    </label>
                    <Textarea
                        value={suggestionComment}
                        onChange={(e) => setSuggestionComment(e.target.value)}
                        placeholder="Опишите причину изменений..."
                        rows={2}
                        className="bg-background"
                    />
                </div>
            )}


            <div className="bg-card rounded-xl border border-border p-5 mb-5">

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        {(isEditing || isSuggesting) ? (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Название</label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Название клиента"
                                        className="text-xl font-bold h-12"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Контрагент</label>
                                    <Input
                                        value={formData.contractor}
                                        onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                                        placeholder="ООО Название"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-foreground mb-1">{clientData.name}</h1>
                                <p className="text-muted-foreground">{clientData.contractor}</p>
                            </>
                        )}
                    </div>


                    <div className="shrink-0">
                        {(isEditing || isSuggesting) ? (
                            <Select
                                value={formData.status}
                                onValueChange={(v) => setFormData({ ...formData, status: v as ServiceStatus })}
                            >
                                <SelectTrigger className={cn(
                                    "w-[180px] flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                                    "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:outline-none",
                                    "shadow-none outline-none ring-0 cursor-pointer hover:opacity-80",
                                    statusConfig.bg,
                                    statusConfig.border
                                )}>
                                    <StatusIcon className={cn("h-5 w-5", statusConfig.color)} />
                                    <span className={cn("font-semibold flex-1 text-left", statusConfig.color)}>
                                        <SelectValue />
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className={cn(
                                "inline-flex items-center gap-2 px-3 py-2 rounded-lg border",
                                statusConfig.bg,
                                statusConfig.border
                            )}>
                                <StatusIcon className={cn("h-5 w-5", statusConfig.color)} />
                                <span className={cn("font-semibold", statusConfig.color)}>
                                    {STATUS_LABELS[clientData.status]}
                                </span>
                            </div>
                        )}
                    </div>
                </div>


            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                <div className="bg-card rounded-xl border border-border p-5">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Реквизиты
                    </h3>
                    {(isEditing || isSuggesting) ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">ИНН</label>
                                    <Input
                                        value={formData.inn}
                                        onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                                        placeholder="7701234567"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-sm font-medium text-foreground">Город</label>
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

                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-sm font-medium text-foreground">Тип договора</label>
                                <Combobox
                                    items={agreementItems}
                                    value={formData.agreementId}
                                    onSelect={(val) => setFormData({ ...formData, agreementId: val })}
                                    placeholder="Выберите тип договора..."
                                    searchPlaceholder="Поиск договора..."
                                    className="w-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Кол-во фронтов</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.frontsCount || ""}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            setFormData(prev => ({
                                                ...prev,
                                                frontsCount: val,
                                                frontsOnService: prev.frontsCount === prev.frontsOnService ? val : prev.frontsOnService
                                            }));
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">На обслуживании</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.frontsOnService || ""}
                                        onChange={(e) => setFormData({ ...formData, frontsOnService: Math.max(0, parseInt(e.target.value) || 0) })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Checkbox
                                    id="hasChain"
                                    checked={formData.hasChain}
                                    onCheckedChange={(c) => setFormData({ ...formData, hasChain: c as boolean })}
                                />
                                <label htmlFor="hasChain" className="text-sm text-foreground cursor-pointer select-none flex items-center gap-1.5">
                                    <LinkIcon className="h-4 w-4 text-purple-500" />
                                    Сетевой клиент (Chain)
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-muted-foreground text-sm block mb-1">ИНН</span>
                                <span className="text-foreground font-mono">{clientData.inn}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-sm block mb-1">Город</span>
                                <span className="text-foreground flex items-center gap-1">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    {clientData.city}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-muted-foreground text-sm block mb-1">Тип договора</span>
                                <span className="text-foreground">{clientData.contractType}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-sm block mb-1">Кол-во фронтов</span>
                                <span className="text-foreground font-medium">{clientData.frontsCount}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-sm block mb-1">На обслуживании</span>
                                <span className="text-foreground font-medium">
                                    {clientData.frontsOnService}
                                </span>
                            </div>
                            {clientData.hasChain && (
                                <div className="col-span-2 pt-1">
                                    <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-sm font-medium">
                                        <LinkIcon className="h-3.5 w-3.5" />
                                        Chain (Сетевой)
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>


                <div className="bg-card rounded-xl border border-border p-5">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Ответственные
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <span className="text-muted-foreground text-sm block mb-2">Менеджер</span>
                            {(isEditing || isSuggesting) ? (
                                <Combobox
                                    items={managerItems}
                                    value={formData.managerId}
                                    onSelect={(val) => setFormData({ ...formData, managerId: val })}
                                    placeholder="Выберите менеджера..."
                                    searchPlaceholder="Поиск менеджера..."
                                    className="w-full"
                                />
                            ) : clientData.manager ? (
                                <div className="flex items-center gap-2 h-10">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={clientData.manager.avatar || undefined} />
                                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                            {clientData.manager.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-foreground">{clientData.manager.name}</span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground h-10 flex items-center">Не назначен</span>
                            )}
                        </div>
                        <div>
                            <span className="text-muted-foreground text-sm block mb-1">Создал</span>
                            <span className="text-foreground h-10 flex items-center">{clientData.createdBy?.name || "Система"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-auto pt-2">
                            <Calendar className="h-4 w-4" />
                            Создан: {new Date(clientData.createdAt).toLocaleDateString("ru-RU")}
                        </div>
                    </div>
                </div>
            </div>


            <div className="bg-card rounded-xl border border-border p-5 mb-5">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Дополнения
                </h3>
                <AddonSelector
                    allAddons={allAddons}
                    selectedAddonIds={(isEditing || isSuggesting) ? formData.addons : clientData.addons.map(a => a.addon.id)}
                    onChange={(ids) => (isEditing || isSuggesting) && setFormData({ ...formData, addons: ids })}
                    readOnly={!(isEditing || isSuggesting)}
                />
            </div>


            {
                (client.notes || isEditing) && (
                    <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-800/30 p-5 mb-5">
                        <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Примечания
                        </h3>
                        {(isEditing || isSuggesting) ? (
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Важные заметки о клиенте..."
                                rows={3}
                                className="bg-background/80"
                            />
                        ) : (
                            <p className="text-amber-800 dark:text-amber-200/90">{client.notes}</p>
                        )}
                    </div>
                )
            }


            {
                (client.individualTerms || isEditing) && (
                    <div className="bg-card rounded-xl border border-border p-5 mb-6">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                            Индивидуальные условия
                        </h3>
                        {(isEditing || isSuggesting) ? (
                            <Textarea
                                value={formData.individualTerms}
                                onChange={(e) => setFormData({ ...formData, individualTerms: e.target.value })}
                                placeholder="Особые условия договора..."
                                rows={3}
                            />
                        ) : (
                            <p className="text-foreground">{client.individualTerms}</p>
                        )}
                    </div>
                )
            }


            <div className="bg-card rounded-xl border border-border p-5 mb-6">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Описание
                </h3>
                {(isEditing || isSuggesting) ? (
                    <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Подробное описание клиента..."
                        rows={6}
                    />
                ) : clientData.description ? (
                    <p className="text-foreground whitespace-pre-wrap">{clientData.description}</p>
                ) : (
                    <p className="text-muted-foreground italic">Описание не заполнено</p>
                )}
            </div>


            <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Прикреплённые файлы ({clientData.files?.length || 0})
                </h3>

                {(clientData.files?.length || 0) > 0 || selectedFiles.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">

                        {clientData.files?.map((file) => {
                            const isDeleted = filesToDelete.has(file.id);
                            return (
                                <div
                                    key={file.id}
                                    className={cn(
                                        "relative group rounded-lg border border-border overflow-hidden bg-muted/30 transition-all",
                                        isDeleted ? "opacity-50 grayscale" : ""
                                    )}
                                >


                                    {file.fileType === "image" ? (
                                        <div onClick={() => setPreviewFile(file)} className="cursor-pointer">
                                            <img
                                                src={file.storagePath}
                                                alt={file.filename}
                                                className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                                            />
                                        </div>
                                    ) : file.fileType === "video" ? (
                                        <div onClick={() => setPreviewFile(file)} className="cursor-pointer relative">
                                            <video
                                                src={file.storagePath}
                                                className="w-full h-32 object-cover"
                                                preload="metadata"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                                <Film className="h-8 w-8 text-white/80" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="w-full h-32 flex items-center justify-center bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                                            onClick={() => setPreviewFile(file)}
                                        >
                                            <Paperclip className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}


                                    <div className="p-2 border-t border-border">
                                        <p className={cn("text-xs text-foreground truncate", isDeleted && "line-through decoration-red-500")} title={file.filename}>
                                            {file.filename}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(file.createdAt).toLocaleDateString("ru-RU")}
                                        </p>
                                    </div>


                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!isDeleted && (
                                            <a
                                                href={`/api/download?fileId=${file.id}`}
                                                className="p-1.5 rounded-md bg-background/80 hover:bg-background text-foreground"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                        {isEditing && (
                                            <button
                                                onClick={() => deleteFile(file.id)}
                                                className="p-1.5 rounded-md bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {isSuggesting && (
                                            <button
                                                onClick={() => toggleFileDeletion(file.id)}
                                                className={cn(
                                                    "p-1.5 rounded-md text-foreground",
                                                    isDeleted
                                                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                                        : "bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                                )}
                                            >
                                                {isDeleted ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                                            </button>
                                        )}
                                    </div>


                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                        {file.fileType === "image" && (
                                            <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/80 text-white flex items-center gap-1 w-fit">
                                                <Image className="h-3 w-3" />
                                            </span>
                                        )}
                                        {file.fileType === "video" && (
                                            <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/80 text-white flex items-center gap-1 w-fit">
                                                <Film className="h-3 w-3" />
                                            </span>
                                        )}
                                        {isDeleted && (
                                            <span className="px-1.5 py-0.5 rounded text-xs bg-destructive text-destructive-foreground flex items-center gap-1 w-fit">
                                                Удалён
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}


                        {selectedFiles.map((file, index) => (
                            <div
                                key={`pending-${index}`}
                                className="relative rounded-lg border-2 border-dashed border-blue-500/50 overflow-hidden bg-blue-500/5"
                            >

                                {file.type.startsWith("image/") ? (
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className="w-full h-32 object-cover"
                                    />
                                ) : file.type.startsWith("video/") ? (
                                    <video
                                        src={URL.createObjectURL(file)}
                                        className="w-full h-32 object-cover"
                                        preload="metadata"
                                    />
                                ) : (
                                    <div className="w-full h-32 flex items-center justify-center bg-blue-500/10">
                                        <Upload className="h-8 w-8 text-blue-500" />
                                    </div>
                                )}


                                <div className="p-2 border-t border-blue-500/30">
                                    <p className="text-xs text-foreground truncate" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-blue-500 font-medium">Будет загружен</p>
                                </div>


                                <button
                                    onClick={() => removeSelectedFile(index)}
                                    className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>


                                <div className="absolute top-2 left-2">
                                    <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500 text-white">
                                        Новый
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground italic mb-4">Файлы не прикреплены</p>
                )}


                {(isEditing || isSuggesting) && (
                    <>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                            onChange={handleFileSelect}
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-dashed"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Добавить файлы
                        </Button>
                    </>
                )}
            </div>

            <FilePreviewDialog
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
            />
        </div>
    );
}
