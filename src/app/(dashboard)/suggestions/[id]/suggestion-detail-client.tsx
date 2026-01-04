"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
    ArrowLeft,
    Check,
    XCircle,
    Clock,
    CheckCircle,
    AlertCircle,
    Building2,
    MapPin,
    FileText,
    Tag,
    User,
    MessageSquare,
    Paperclip,
    Download,
    Eye,
    Store,
    AlertTriangle,
    Leaf,
    Rocket,
    Calendar,
    Link as LinkIcon,
    ChevronDown,
    ArrowRight,
} from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { STATUS_LABELS, cn } from "@/lib/utils";
import type { SuggestionStatus, ServiceStatus } from "@/generated/prisma/enums.js";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FilePreviewDialog } from "@/components/files/file-preview-dialog";



interface FileData {
    id: string;
    filename: string;
    storagePath: string;
    fileType: string;
    mimeType?: string;
    size?: number;
    createdAt: Date;
}

interface ServicePointData {
    id: string;
    name: string;
    address: string | null;
    crmId?: string | null;
    city: { id: string; name: string } | null;
    frontsCount: number;
    frontsOnService: number;
    description?: string | null;
    notes?: string | null;
    individualTerms?: string | null;
    addons: { addon: { id: string; name: string; color: string | null } }[];
    files: FileData[];
}

interface SuggestionDetailClientProps {
    suggestion: {
        id: string;
        status: SuggestionStatus;
        comment: string | null;
        createdAt: Date;
        reviewedAt: Date | null;
        changes: Record<string, { old: unknown; new: unknown }>;
        author: {
            id: string;
            name: string;
            avatar: string | null;
        };
        reviewer: {
            id: string;
            name: string;
        } | null;
        files: FileData[];
    };
    contractor: {
        id: string;
        name: string;
        inn: string;
        status: ServiceStatus;
        hasChain: boolean;
        totalFronts: number;
        frontsOnService: number;
        primaryCity: { id: string; name: string } | null;
        agreement: { id: string; name: string } | null;
        generalNotes: string | null;
        generalDescription: string | null;
        generalIndividualTerms: string | null;
        manager: {
            id: string;
            name: string;
            avatar: string | null;
        } | null;
        createdBy?: { id: string; name: string };
        createdAt?: Date;
        servicePoints: ServicePointData[];
        files: FileData[];
    };
    lookups: {
        cities: { id: string; name: string }[];
        agreements: { id: string; name: string }[];
        users: { id: string; name: string }[];
    };
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



const fieldLabels: Record<string, string> = {
    name: "Название",
    inn: "ИНН",
    status: "Статус",
    hasChain: "Сетевой клиент",
    primaryCityId: "Основной город",
    agreementId: "Тип договора",
    managerId: "Менеджер",
    generalNotes: "Примечания",
    generalDescription: "Описание",
    generalIndividualTerms: "Индивидуальные условия",
    files: "Файлы",
    servicePoints: "Точки обслуживания",
    address: "Адрес",
    cityId: "Город",
    frontsCount: "Количество фронтов",
    frontsOnService: "На обслуживании",
    description: "Описание точки",
    notes: "Примечания точки",
    individualTerms: "Индивидуальные условия точки",
    crmId: "CRM ID",
    addonIds: "Дополнения",
};



export function SuggestionDetailClient({ suggestion, contractor, lookups }: SuggestionDetailClientProps) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileData | null>(null);
    const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());

    const togglePointExpanded = (id: string) => {
        const newSet = new Set(expandedPoints);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedPoints(newSet);
    };


    const [acceptedFields, setAcceptedFields] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        Object.keys(suggestion.changes).forEach(key => {
            if (key !== "servicePoints" && key !== "files") {
                initial[key] = true;
            }
        });
        return initial;
    });

    const [acceptedSPDeletes, setAcceptedSPDeletes] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        const spChange = suggestion.changes.servicePoints?.new as { deletes?: string[] } | undefined;
        if (spChange?.deletes) {
            spChange.deletes.forEach((id: string) => initial.add(id));
        }
        return initial;
    });

    const [acceptedSPUpdates, setAcceptedSPUpdates] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        const spChange = suggestion.changes.servicePoints?.new as { updates?: Array<{ id: string, diff: Record<string, unknown> }> } | undefined;
        if (spChange?.updates) {
            spChange.updates.forEach((update) => {
                Object.keys(update.diff).forEach((key: string) => {
                    initial.add(`${update.id}.${key}`);
                });
            });
        }
        return initial;
    });

    const [acceptedFileChanges, setAcceptedFileChanges] = useState(true);

    const isPending = suggestion.status === "PENDING";


    const getChange = (field: string): { old: unknown; new: unknown } | null => {
        return suggestion.changes[field] || null;
    };


    const renderValue = (field: string, value: unknown): string => {
        if (value === null || value === undefined || value === "") return "—";
        if (field === "status" && typeof value === "string") {
            return STATUS_LABELS[value as keyof typeof STATUS_LABELS] || value;
        }
        if (field === "hasChain") return value ? "Да" : "Нет";
        // Lookup names for ID fields
        if (field === "primaryCityId" || field === "cityId") {
            const city = lookups.cities.find(c => c.id === value);
            return city?.name || String(value);
        }
        if (field === "agreementId") {
            const agreement = lookups.agreements.find(a => a.id === value);
            return agreement?.name || String(value);
        }
        if (field === "managerId") {
            const user = lookups.users.find(u => u.id === value);
            return user?.name || String(value);
        }
        if (field === "files" && typeof value === "object") {
            const filesChange = value as { removed?: string[], added?: string[] };
            const parts = [];
            if (filesChange.added?.length) parts.push(`+${filesChange.added.length} файлов`);
            if (filesChange.removed?.length) parts.push(`-${filesChange.removed.length} файлов`);
            return parts.join(", ") || "Изменения файлов";
        }
        return String(value);
    };


    const toggleField = (field: string) => {
        setAcceptedFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const toggleSPDelete = (id: string) => {
        setAcceptedSPDeletes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSPUpdate = (id: string, key: string) => {
        const compositeKey = `${id}.${key}`;
        setAcceptedSPUpdates(prev => {
            const next = new Set(prev);
            if (next.has(compositeKey)) next.delete(compositeKey);
            else next.add(compositeKey);
            return next;
        });
    };


    const handleAction = async (action: "approve" | "reject") => {
        if (action === "approve" && !isConfirmOpen) {
            setIsConfirmOpen(true);
            return;
        }

        if (action === "reject" && !isRejectDialogOpen) {
            setIsRejectDialogOpen(true);
            return;
        }

        setIsProcessing(true);
        try {
            const body: Record<string, unknown> = { action };

            if (action === "approve") {
                body.acceptedFields = Object.entries(acceptedFields)
                    .filter(([, accepted]) => accepted)
                    .map(([field]) => field);

                if (acceptedFileChanges && suggestion.changes.files) {
                    body.acceptedFields = [...(body.acceptedFields as string[]), "files"];
                }

                if (suggestion.changes.servicePoints) {
                    const spChange = suggestion.changes.servicePoints.new as {
                        updates?: Array<{ id: string, diff: Record<string, { old: unknown, new: unknown }> }>,
                        deletes?: string[]
                    };

                    const overrideUpdates: Array<{ id: string, diff: Record<string, { old: unknown, new: unknown }> }> = [];
                    if (spChange.updates) {
                        spChange.updates.forEach((update) => {
                            const acceptedKeys = Object.keys(update.diff).filter(key =>
                                acceptedSPUpdates.has(`${update.id}.${key}`)
                            );

                            if (acceptedKeys.length > 0) {
                                const newDiff: Record<string, { old: unknown, new: unknown }> = {};
                                acceptedKeys.forEach(key => {
                                    newDiff[key] = update.diff[key];
                                });
                                overrideUpdates.push({ id: update.id, diff: newDiff });
                            }
                        });
                    }

                    body.servicePointsOverride = {
                        updates: overrideUpdates,
                        deletes: Array.from(acceptedSPDeletes)
                    };

                    if (overrideUpdates.length > 0 || acceptedSPDeletes.size > 0) {
                        body.acceptedFields = [...(body.acceptedFields as string[]), "servicePoints"];
                    }
                }
            }

            const response = await fetch(`/api/suggestions/${suggestion.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                window.dispatchEvent(new Event("suggestions-updated"));
                window.dispatchEvent(new Event("suggestions-updated"));


                const targetTab = action === "approve" ? "approved" : "rejected";
                router.push(`/my-clients?tab=suggestions&suggestionTab=${targetTab}`);
                router.refresh();
                router.refresh();
            } else {
                const data = await response.json();
                alert(data.error || "Ошибка при обработке");
            }
        } catch {
            alert("Ошибка сети");
        } finally {
            setIsProcessing(false);
            setIsConfirmOpen(false);
            setIsRejectDialogOpen(false);
        }
    };


    const removedFileIds: string[] = (suggestion.changes.files?.new as { removed?: string[] })?.removed || [];
    const addedFiles = suggestion.files || [];
    const hasFileChanges = removedFileIds.length > 0 || addedFiles.length > 0;


    const spChange = suggestion.changes.servicePoints?.new as {
        updates?: Array<{ id: string, diff: Record<string, { old: unknown, new: unknown }> }>,
        deletes?: string[]
    } | undefined;
    const spUpdates = spChange?.updates || [];
    const spDeletes = spChange?.deletes || [];


    const statusChange = getChange("status");
    const displayStatus = (statusChange?.new as ServiceStatus) || contractor.status;
    const statusConfig = STATUS_CONFIG[displayStatus];
    const StatusIcon = statusConfig.icon;



    const ChangeIndicator = ({
        field,
        showToggle = true,
    }: {
        field: string;
        showToggle?: boolean;
    }) => {
        const change = getChange(field);
        if (!change) return null;

        const isAccepted = acceptedFields[field] ?? true;

        return (
            <div className="mt-2 p-3 rounded-lg border border-amber-400 bg-amber-50/50 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                    {showToggle && isPending && (
                        <Switch
                            checked={isAccepted}
                            onCheckedChange={() => toggleField(field)}
                            className="mt-0.5 shrink-0 data-[state=checked]:bg-emerald-600"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-2">
                            Предложено изменение
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 overflow-hidden">
                                <span className="text-[10px] font-bold text-red-600 uppercase block mb-1">Было</span>
                                <TruncatedText
                                    text={renderValue(field, change.old)}
                                    textClassName="text-red-700 dark:text-red-300"
                                    maxLength={80}
                                    title={`Было: ${fieldLabels[field] || field}`}
                                />
                            </div>
                            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 overflow-hidden">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Станет</span>
                                <TruncatedText
                                    text={renderValue(field, change.new)}
                                    textClassName="text-emerald-700 dark:text-emerald-300 font-medium"
                                    maxLength={80}
                                    title={`Станет: ${fieldLabels[field] || field}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    return (
        <div className="p-6 max-w-5xl mx-auto">

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Подтверждение изменений</DialogTitle>
                        <DialogDescription>
                            Выбранные изменения будут применены. Снимите флажки с изменений, которые не хотите применять.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-3 max-h-[50vh] overflow-y-auto">
                        {Object.keys(acceptedFields).map(field => (
                            <div key={field} className="flex items-center gap-3 p-2 rounded border border-border">
                                <Switch
                                    checked={acceptedFields[field]}
                                    onCheckedChange={() => toggleField(field)}
                                />
                                <div className="flex-1">
                                    <span className="font-medium">{fieldLabels[field] || field}</span>
                                    <div className="text-xs text-muted-foreground break-all">
                                        {renderValue(field, getChange(field)?.old)} → {renderValue(field, getChange(field)?.new)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {hasFileChanges && (
                            <div className="flex items-center gap-3 p-2 rounded border border-border">
                                <Switch
                                    checked={acceptedFileChanges}
                                    onCheckedChange={setAcceptedFileChanges}
                                />
                                <div className="flex-1">
                                    <span className="font-medium">Изменения файлов</span>
                                    <div className="text-xs text-muted-foreground">
                                        {addedFiles.length > 0 && <span className="text-emerald-600">+{addedFiles.length} </span>}
                                        {removedFileIds.length > 0 && <span className="text-red-600">-{removedFileIds.length}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {spUpdates.length > 0 && (
                            <div className="border-t pt-3 mt-3">
                                <div className="text-sm font-medium text-muted-foreground mb-2">Изменения точек обслуживания</div>
                                {spUpdates.map(update => {
                                    const point = contractor.servicePoints.find(p => p.id === update.id);
                                    return (
                                        <div key={update.id} className="mb-3 p-2 rounded border border-border bg-muted/20">
                                            <div className="font-medium text-sm mb-2 flex items-center gap-2">
                                                <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="truncate max-w-[200px]" title={point?.name || "Точка"}>{point?.name || "Точка"}</span>
                                            </div>
                                            {Object.keys(update.diff).map(key => {
                                                const compositeKey = `${update.id}.${key}`;
                                                const isAccepted = acceptedSPUpdates.has(compositeKey);
                                                return (
                                                    <div key={key} className="flex items-center gap-2 py-1 ml-4">
                                                        <Switch
                                                            checked={isAccepted}
                                                            onCheckedChange={() => toggleSPUpdate(update.id, key)}
                                                            className="scale-75"
                                                        />
                                                        <span className="text-sm">{fieldLabels[key] || key}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {spDeletes.length > 0 && (
                            <div className="border-t pt-3 mt-3">
                                <div className="text-sm font-medium text-red-600 mb-2">Удаление точек</div>
                                {spDeletes.map(id => {
                                    const point = contractor.servicePoints.find(p => p.id === id);
                                    const isAccepted = acceptedSPDeletes.has(id);
                                    return (
                                        <div key={id} className="flex items-center gap-2 p-2 rounded border border-red-200 bg-red-50/50">
                                            <Switch
                                                checked={isAccepted}
                                                onCheckedChange={() => toggleSPDelete(id)}
                                                className="data-[state=checked]:bg-emerald-600 shrink-0"
                                            />
                                            <span className="text-sm text-red-700 truncate max-w-[200px]" title={point?.name || "Неизвестная точка"}>{point?.name || "Неизвестная точка"}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                            Отмена
                        </Button>
                        <Button
                            onClick={() => handleAction("approve")}
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Применение..." : "Применить выбранное"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Отклонение предложения</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите отклонить это предложение? Это действие нельзя будет отменить.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleAction("reject")}
                            disabled={isProcessing}
                            className="text-white"
                        >
                            {isProcessing ? "Отклонение..." : "Да, отклонить"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Link href={`/my-clients?tab=suggestions&suggestionTab=${suggestion.status === "APPROVED" ? "approved" :
                            suggestion.status === "REJECTED" ? "rejected" :
                                "pending"
                            }`}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Назад
                        </Link>
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    {isPending ? (
                        <>
                            <Button
                                onClick={() => handleAction("approve")}
                                disabled={isProcessing}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                Принять изменения
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleAction("reject")}
                                disabled={isProcessing}
                                className="border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Отклонить
                            </Button>
                        </>
                    ) : (
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                            suggestion.status === "APPROVED"
                                ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                                : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                        )}>
                            {suggestion.status === "APPROVED" ? (
                                <><CheckCircle className="h-4 w-4" /> Принято</>
                            ) : (
                                <><AlertCircle className="h-4 w-4" /> Отклонено</>
                            )}
                        </div>
                    )}
                </div>
            </div>


            <div className={cn(
                "mb-6 p-4 rounded-lg border",
                isPending
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    : suggestion.status === "APPROVED"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            )}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {isPending ? (
                            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        ) : suggestion.status === "APPROVED" ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <div>
                            <p className={cn(
                                "font-medium",
                                isPending ? "text-amber-800 dark:text-amber-200"
                                    : suggestion.status === "APPROVED" ? "text-emerald-800 dark:text-emerald-200"
                                        : "text-red-800 dark:text-red-200"
                            )}>
                                {isPending ? "Предложение ожидает рассмотрения" : suggestion.status === "APPROVED" ? "Изменения применены" : "Предложение отклонено"}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={suggestion.author.avatar || undefined} />
                                    <AvatarFallback className="text-[10px]">{suggestion.author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>От <strong>{suggestion.author.name}</strong></span>
                                <span>•</span>
                                <span>{new Date(suggestion.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                            </div>
                        </div>
                    </div>
                    {suggestion.reviewer && (
                        <div className="text-sm text-muted-foreground text-right">
                            <div>Рассмотрено: {suggestion.reviewer.name}</div>
                            {suggestion.reviewedAt && <div>{new Date(suggestion.reviewedAt).toLocaleDateString("ru-RU")}</div>}
                        </div>
                    )}
                </div>
            </div>


            {suggestion.comment && (
                <div className="mb-6 p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Комментарий автора</span>
                    </div>
                    <p className="text-foreground">{suggestion.comment}</p>
                </div>
            )}


            <div className={cn(
                "rounded-xl border-2 p-6 mb-6 transition-all",
                statusConfig.bg,
                statusConfig.border
            )}>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-4 mb-1">
                            <h1 className="text-2xl font-bold text-foreground leading-tight">
                                {getChange("name") ? (
                                    <span className="flex flex-col gap-1">
                                        <span className="line-through text-muted-foreground text-lg break-all">{contractor.name}</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 break-all">{getChange("name")?.new as string}</span>
                                    </span>
                                ) : <span className="break-all">{contractor.name}</span>}
                            </h1>
                            <ChangeIndicator field="name" showToggle={true} />
                        </div>

                        <div className="flex items-center gap-2">
                            {getChange("inn") ? (
                                <span className="flex items-center gap-2 break-all">
                                    <span className="line-through text-xs text-muted-foreground">{contractor.inn}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="font-mono text-sm text-foreground bg-emerald-500/10 px-1 rounded">{getChange("inn")?.new as string}</span>
                                </span>
                            ) : (
                                <span className="font-mono text-sm text-muted-foreground break-all">ИНН {contractor.inn}</span>
                            )}
                            <ChangeIndicator field="inn" showToggle={true} />
                        </div>
                    </div>


                    <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className={cn(
                            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 bg-background/50",
                            statusConfig.border
                        )}>
                            <StatusIcon className={cn("h-5 w-5", statusConfig.color)} />
                            <span className={cn("font-bold text-lg", statusConfig.color)}>
                                {STATUS_LABELS[displayStatus]}
                            </span>
                        </div>
                        <ChangeIndicator field="status" />
                    </div>
                </div>


                <div className="flex flex-col lg:flex-row lg:items-center gap-4 pt-4 border-t border-white/10">

                    <div className="flex gap-6">
                        <div className="text-center" title="Сервисных точек">
                            <span className={cn("text-3xl font-bold block leading-none", statusConfig.color)}>
                                {contractor.servicePoints.length}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">точек</span>
                        </div>
                        <div className="text-center" title="Всего фронтов">
                            <span className={cn("text-3xl font-bold block leading-none", statusConfig.color)}>
                                {contractor.totalFronts}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">фронтов</span>
                        </div>
                        <div className="text-center" title="На обслуживании">
                            <span className={cn("text-3xl font-bold block leading-none", statusConfig.color)}>
                                {contractor.frontsOnService}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">на обсл.</span>
                        </div>
                    </div>


                    <div className="hidden lg:block w-px h-12 bg-white/10" />


                    <div className="flex flex-wrap items-start gap-6 lg:flex-1">

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Город</span>
                            <span className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                {renderValue("primaryCityId", getChange("primaryCityId")?.new || contractor.primaryCity?.id)}
                            </span>
                            <ChangeIndicator field="primaryCityId" />
                        </div>


                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Договор</span>
                            <span className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                {renderValue("agreementId", getChange("agreementId")?.new || contractor.agreement?.id)}
                            </span>
                            <ChangeIndicator field="agreementId" />
                        </div>


                        {(contractor.hasChain || getChange("hasChain")) && (
                            <div className="flex flex-col gap-1">
                                {(getChange("hasChain")?.new || contractor.hasChain) ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 text-sm font-medium border border-purple-500/20">
                                        <LinkIcon className="h-3.5 w-3.5" />
                                        Сетевой
                                    </span>
                                ) : null}
                                <ChangeIndicator field="hasChain" />
                            </div>
                        )}


                        <div className="flex-1" />


                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Менеджер</span>
                            <div className="flex items-center gap-2">
                                {(getChange("managerId")?.new || contractor.manager) ? (
                                    <>
                                        <Avatar className="h-6 w-6 ring-2 ring-white/20">
                                            <AvatarImage src={contractor.manager?.avatar || undefined} />
                                            <AvatarFallback className="bg-background/50 text-foreground text-xs">
                                                {contractor.manager?.name.charAt(0) || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm text-foreground font-medium">
                                            {renderValue("managerId", getChange("managerId")?.new || contractor.manager?.name)}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">Не назначен</span>
                                )}
                            </div>
                            <ChangeIndicator field="managerId" />
                        </div>
                    </div>
                </div>
            </div>


            {(contractor.generalNotes || getChange("generalNotes")) && (
                <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-800/30 p-5 mb-5">
                    <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Общие примечания
                    </h3>
                    <TruncatedText
                        text={contractor.generalNotes || "—"}
                        textClassName="text-amber-800 dark:text-amber-200/90"
                        maxLength={150}
                        title="Общие примечания"
                    />
                    <ChangeIndicator field="generalNotes" />
                </div>
            )}


            {(contractor.generalIndividualTerms || getChange("generalIndividualTerms")) && (
                <div className="bg-card rounded-xl border border-border p-5 mb-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Общие индивидуальные условия
                    </h3>
                    <TruncatedText
                        text={contractor.generalIndividualTerms || "—"}
                        textClassName="text-foreground"
                        maxLength={150}
                        title="Индивидуальные условия"
                    />
                    <ChangeIndicator field="generalIndividualTerms" />
                </div>
            )}


            {(contractor.generalDescription || getChange("generalDescription")) && (
                <div className="bg-card rounded-xl border border-border p-5 mb-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Общее описание
                    </h3>
                    <TruncatedText
                        text={contractor.generalDescription || "Описание не заполнено"}
                        textClassName="text-foreground"
                        maxLength={300}
                        title="Общее описание"
                    />
                    <ChangeIndicator field="generalDescription" />
                </div>
            )}


            <div className="bg-card rounded-xl border border-border p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Точки ({contractor.servicePoints.length})
                    </h3>
                </div>

                {contractor.servicePoints.length === 0 ? (
                    <p className="text-muted-foreground italic text-center py-8">
                        Нет точек обслуживания.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {contractor.servicePoints.map((point) => {
                            const isExpanded = expandedPoints.has(point.id);
                            const isMarkedForDelete = spDeletes.includes(point.id);
                            const pointUpdate = spUpdates.find(u => u.id === point.id);
                            const serviceRatio = point.frontsCount > 0 ? point.frontsOnService / point.frontsCount : 0;

                            return (
                                <div
                                    key={point.id}
                                    className={cn(
                                        "rounded-lg overflow-hidden transition-all border",
                                        isMarkedForDelete
                                            ? "border-red-400 bg-red-950/20"
                                            : pointUpdate
                                                ? "border-amber-400 bg-amber-500/5 dark:bg-amber-950/20"
                                                : "border-border hover:bg-muted/30"
                                    )}
                                >

                                    <button
                                        onClick={() => togglePointExpanded(point.id)}
                                        className="w-full px-4 py-3 flex items-center gap-4 transition-colors text-left"
                                    >

                                        <div
                                            className={cn(
                                                "w-1 h-8 rounded-full shrink-0",
                                                serviceRatio >= 1 ? "bg-emerald-500" :
                                                    serviceRatio >= 0.5 ? "bg-amber-500" :
                                                        serviceRatio > 0 ? "bg-orange-500" : "bg-gray-400"
                                            )}
                                        />


                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={cn(
                                                    "font-medium truncate",
                                                    isMarkedForDelete && "line-through text-red-500"
                                                )}>
                                                    {point.name}
                                                </span>
                                                {isMarkedForDelete && (
                                                    <span className="text-[10px] font-bold text-red-500 uppercase bg-red-500/20 px-1.5 py-0.5 rounded shrink-0">
                                                        К удалению
                                                    </span>
                                                )}
                                                {pointUpdate && !isMarkedForDelete && (
                                                    <span className="text-[10px] font-bold text-amber-500 uppercase bg-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                                                        Изменено
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                    {point.city?.name || "—"}{point.address && ` • ${point.address}`}
                                                </span>
                                            </div>
                                        </div>


                                        <div className="text-sm text-muted-foreground shrink-0">
                                            <span className="font-semibold text-foreground">{point.frontsOnService}</span>
                                            <span>/{point.frontsCount} фронтов</span>
                                        </div>

                                        <ChevronDown className={cn(
                                            "h-4 w-4 text-muted-foreground transition-transform",
                                            isExpanded && "rotate-180"
                                        )} />
                                    </button>


                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">

                                            {(isMarkedForDelete || pointUpdate) && (
                                                <div className="mb-4 space-y-3">
                                                    {isMarkedForDelete && (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                                                            {isPending && (
                                                                <Switch
                                                                    checked={acceptedSPDeletes.has(point.id)}
                                                                    onCheckedChange={() => toggleSPDelete(point.id)}
                                                                    className="data-[state=checked]:bg-emerald-600"
                                                                />
                                                            )}
                                                            <span className="text-sm font-medium text-red-600">Подтвердить удаление точки</span>
                                                        </div>
                                                    )}

                                                    {pointUpdate && (
                                                        <div className="space-y-2">
                                                            <div className="text-xs font-bold text-amber-600 uppercase mb-1">Предложенные изменения:</div>
                                                            {Object.keys(pointUpdate.diff).map(key => {
                                                                const compositeKey = `${point.id}.${key}`;
                                                                const isAccepted = acceptedSPUpdates.has(compositeKey);
                                                                const change = pointUpdate.diff[key] as { old: any, new: any };

                                                                return (
                                                                    <div key={key} className="p-2 border border-amber-500/30 bg-amber-500/10 rounded-lg">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            {isPending && (
                                                                                <Switch
                                                                                    checked={isAccepted}
                                                                                    onCheckedChange={() => toggleSPUpdate(point.id, key)}
                                                                                    className="scale-75 origin-left data-[state=checked]:bg-emerald-600"
                                                                                />
                                                                            )}
                                                                            <span className="text-xs font-bold uppercase text-amber-600">{fieldLabels[key] || key}</span>
                                                                        </div>
                                                                        <div className="text-xs grid grid-cols-2 gap-2 pl-9">
                                                                            <div>
                                                                                <span className="text-[10px] text-muted-foreground block">Было:</span>
                                                                                <div className="text-red-500 line-through opacity-70">
                                                                                    <TruncatedText
                                                                                        text={renderValue(key, change.old)}
                                                                                        textClassName="text-red-500"
                                                                                        maxLength={50}
                                                                                        title={`Было: ${fieldLabels[key] || key}`}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[10px] text-muted-foreground block">Станет:</span>
                                                                                <div className="text-emerald-500 font-medium">
                                                                                    <TruncatedText
                                                                                        text={renderValue(key, change.new)}
                                                                                        textClassName="text-emerald-500"
                                                                                        maxLength={50}
                                                                                        title={`Станет: ${fieldLabels[key] || key}`}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}


                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm opacity-90">
                                                <div className="bg-muted/30 rounded-lg px-3 py-2">
                                                    <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Город</span>
                                                    <span className="text-foreground font-medium break-all">{point.city?.name || "—"}</span>
                                                </div>
                                                <div className="bg-muted/30 rounded-lg px-3 py-2">
                                                    <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Фронтов</span>
                                                    <span className="text-foreground font-medium">{point.frontsOnService} / {point.frontsCount}</span>
                                                </div>
                                                {point.crmId && (
                                                    <div className="bg-muted/30 rounded-lg px-3 py-2">
                                                        <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">CRM ID</span>
                                                        <span className="text-foreground font-mono">{point.crmId}</span>
                                                    </div>
                                                )}
                                                {point.address && (
                                                    <div className="bg-muted/30 rounded-lg px-3 py-2 col-span-2 sm:col-span-1">
                                                        <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Адрес</span>
                                                        <TruncatedText
                                                            text={point.address}
                                                            textClassName="text-foreground"
                                                            maxLength={80}
                                                            title="Адрес"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {point.description && (
                                                <div className="text-sm">
                                                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">Описание</span>
                                                    <TruncatedText
                                                        text={point.description}
                                                        textClassName="text-foreground"
                                                        maxLength={100}
                                                        title="Описание"
                                                    />
                                                </div>
                                            )}

                                            {point.notes && (
                                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Примечания</span>
                                                    </div>
                                                    <TruncatedText
                                                        text={point.notes}
                                                        textClassName="text-sm text-amber-800 dark:text-amber-200"
                                                        maxLength={100}
                                                        title="Примечания"
                                                    />
                                                </div>
                                            )}

                                            {point.individualTerms && (
                                                <div className="text-sm">
                                                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">Индивидуальные условия</span>
                                                    <TruncatedText
                                                        text={point.individualTerms}
                                                        textClassName="text-foreground"
                                                        maxLength={100}
                                                        title="Индивидуальные условия"
                                                    />
                                                </div>
                                            )}

                                            {point.addons.length > 0 && (
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground uppercase block mb-2">Дополнения</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {point.addons.map(({ addon }) => (
                                                            <span
                                                                key={addon.id}
                                                                className="px-2 py-1 rounded text-xs font-medium"
                                                                style={{
                                                                    backgroundColor: addon.color ? `${addon.color}20` : "rgba(0,0,0,0.1)",
                                                                    color: addon.color || "inherit",
                                                                    border: `1px solid ${addon.color ? `${addon.color}40` : "rgba(0,0,0,0.15)"}`
                                                                }}
                                                            >
                                                                {addon.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>


            <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground mb-8">
                <div className="flex items-center gap-4">
                    <span>Создан: {contractor.createdAt ? new Date(contractor.createdAt).toLocaleDateString("ru-RU") : "—"}</span>
                    {contractor.createdBy && (
                        <span>Автор: {contractor.createdBy.name}</span>
                    )}
                </div>
                <div>ID: {contractor.id}</div>
            </div>


            {hasFileChanges && (
                <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 px-5 py-4 border-b border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 uppercase tracking-wide flex items-center gap-2">
                                <Paperclip className="h-4 w-4" />
                                Изменения файлов
                            </h3>
                            {isPending && (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={acceptedFileChanges}
                                        onCheckedChange={setAcceptedFileChanges}
                                    />
                                    <span className="text-sm text-muted-foreground">Принять изменения файлов</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                            {contractor.files
                                .filter(f => removedFileIds.includes(f.id))
                                .map(file => (
                                    <div key={file.id} className="relative group rounded-lg border border-red-300 bg-red-50/50 overflow-hidden opacity-75">
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded shadow">Будет удалён</span>
                                        </div>
                                        <div className="h-24 bg-muted flex items-center justify-center">
                                            {file.fileType === "image" ? (
                                                <img src={file.storagePath} className="h-full w-full object-cover" alt={file.filename} />
                                            ) : (
                                                <FileText className="h-8 w-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="p-2 border-t text-xs truncate line-through text-red-700">
                                            {file.filename}
                                        </div>
                                    </div>
                                ))
                            }


                            {addedFiles.map(file => (
                                <div key={file.id} className="relative group rounded-lg border border-emerald-300 bg-emerald-50/50 overflow-hidden">
                                    <div className="absolute top-2 left-2 z-10">
                                        <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded shadow">Новый</span>
                                    </div>
                                    <div className="h-24 bg-muted flex items-center justify-center">
                                        {file.fileType === "image" ? (
                                            <img src={file.storagePath} className="h-full w-full object-cover" alt={file.filename} />
                                        ) : (
                                            <FileText className="h-8 w-8 text-emerald-600" />
                                        )}
                                    </div>
                                    <div className="p-2 border-t text-xs truncate text-emerald-700 font-medium">
                                        {file.filename}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setPreviewFile(file)}
                                            className="p-2 rounded-full bg-white text-gray-800 hover:bg-gray-100 shadow-md"
                                            title="Просмотреть"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <a
                                            href={`/api/download?fileId=${file.id}`}
                                            className="p-2 rounded-full bg-white text-gray-800 hover:bg-gray-100 shadow-md"
                                            title="Скачать"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Download className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


            {contractor.files.filter(f => !removedFileIds.includes(f.id)).length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5 mb-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Файлы контрагента
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {contractor.files
                            .filter(f => !removedFileIds.includes(f.id))
                            .map(file => (
                                <div key={file.id} className="group rounded-lg border border-border overflow-hidden">
                                    <div className="h-24 bg-muted flex items-center justify-center">
                                        {file.fileType === "image" ? (
                                            <img src={file.storagePath} className="h-full w-full object-cover" alt={file.filename} />
                                        ) : (
                                            <FileText className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="p-2 border-t text-xs truncate text-muted-foreground">
                                        {file.filename}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}


            <FilePreviewDialog
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
            />
        </div>
    );
}
