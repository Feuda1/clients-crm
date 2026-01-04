"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Switch } from "@/components/ui/switch";
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
    Leaf,
    Rocket,
    AlertTriangle,
    Paperclip,
    Download,
    Trash2,
    Upload,
    Image,
    Film,
    Link as LinkIcon,
    MessageSquarePlus,
    Send,
    RotateCcw,
    Plus,
    ChevronDown,
    ChevronUp,
    Store,
    Eye,
    EyeOff,
} from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
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
} from "@/components/ui/dialog";
import { FilePreviewDialog } from "@/components/files/file-preview-dialog";



interface ServicePointFile {
    id: string;
    filename: string;
    storagePath: string;
    fileType: string;
    mimeType?: string;
    size?: number;
    createdAt: Date;
}

interface ServicePointAddon {
    addon: {
        id: string;
        name: string;
        color: string | null;
    };
}

interface ServicePoint {
    id: string;
    name: string;
    address: string | null;
    crmId: string | null;
    cityId: string | null;
    city: { id: string; name: string } | null;
    frontsCount: number;
    frontsOnService: number;
    description: string | null;
    notes: string | null;
    individualTerms: string | null;
    addons: ServicePointAddon[];
    files: ServicePointFile[];
    createdAt: Date;
    updatedAt: Date;
}

interface ContractorFile {
    id: string;
    filename: string;
    storagePath: string;
    fileType: string;
    mimeType?: string;
    size?: number;
    createdAt: Date;
}

interface Contractor {
    id: string;
    name: string;
    inn: string;
    hasChain: boolean;
    status: ServiceStatus;
    generalDescription: string | null;
    generalNotes: string | null;
    generalIndividualTerms: string | null;
    primaryCityId: string | null;
    primaryCity: { id: string; name: string } | null;
    agreementId: string | null;
    agreement: { id: string; name: string } | null;
    manager: { id: string; name: string; avatar: string | null } | null;
    createdBy: { id: string; name: string };
    servicePoints: ServicePoint[];
    files: ContractorFile[];
    createdAt: Date;
    updatedAt: Date;
    isHidden: boolean;
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

interface ContractorDetailClientProps {
    contractor: Contractor;
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



export function ContractorDetailClient({
    contractor,
    users,
    allAddons,
    cities,
    agreements,
    currentUserId,
    userPermissions,
}: ContractorDetailClientProps) {
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
            (contractor.createdBy?.id === currentUserId ||
                contractor.manager?.id === currentUserId));

    const canDelete =
        hasPermission(userPermissions, "ADMIN") ||
        hasPermission(userPermissions, "DELETE_ALL_CLIENTS") ||
        (hasPermission(userPermissions, "DELETE_OWN_CLIENT") &&
            (contractor.createdBy?.id === currentUserId || contractor.manager?.id === currentUserId));

    const canHide =
        hasPermission(userPermissions, "ADMIN") ||
        hasPermission(userPermissions, "HIDE_ALL_CLIENTS") ||
        (hasPermission(userPermissions, "HIDE_OWN_CLIENT") &&
            (contractor.createdBy?.id === currentUserId || contractor.manager?.id === currentUserId));


    const [contractorData, setContractorData] = useState(contractor);


    const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());


    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set());
    const [previewFile, setPreviewFile] = useState<ContractorFile | null>(null);


    const [editingPoint, setEditingPoint] = useState<ServicePoint | null>(null);
    const [isCreatingPoint, setIsCreatingPoint] = useState(false);
    const [confirmDeletePoint, setConfirmDeletePoint] = useState<ServicePoint | null>(null);
    const [pointFormData, setPointFormData] = useState({
        name: "",
        address: "",
        cityId: "",
        frontsCount: 0,
        frontsOnService: 0,
        description: "",
        notes: "",
        individualTerms: "",
        crmId: "",
        addonIds: [] as string[],
    });
    const [pointFiles, setPointFiles] = useState<File[]>([]);
    const [existingPointFiles, setExistingPointFiles] = useState<ServicePointFile[]>([]);
    const [pointFilesToDelete, setPointFilesToDelete] = useState<Set<string>>(new Set());
    const [suggestedDeletes, setSuggestedDeletes] = useState<Set<string>>(new Set());
    const pointFileInputRef = useRef<HTMLInputElement>(null);


    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showHideConfirm, setShowHideConfirm] = useState(false);


    const [formData, setFormData] = useState({
        name: contractor.name,
        inn: contractor.inn,
        status: contractor.status,
        hasChain: contractor.hasChain,
        primaryCityId: contractor.primaryCityId || "",
        agreementId: contractor.agreementId || "",
        managerId: contractor.manager?.id || "",
        generalDescription: contractor.generalDescription || "",
        generalNotes: contractor.generalNotes || "",
        generalIndividualTerms: contractor.generalIndividualTerms || "",
    });


    const cityItems = cities.map(c => ({ value: c.id, label: c.name }));
    const agreementItems = agreements.map(a => ({ value: a.id, label: a.name }));
    const managerItems = users.map(u => ({ value: u.id, label: u.name }));


    const totalFronts = contractorData.servicePoints.reduce((sum, sp) => sum + sp.frontsCount, 0);
    const frontsOnService = contractorData.servicePoints.reduce((sum, sp) => sum + sp.frontsOnService, 0);



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

    const uploadFiles = async (isPending: boolean = false): Promise<ContractorFile[]> => {
        if (selectedFiles.length === 0) return [];

        const formDataFiles = new FormData();
        selectedFiles.forEach(file => {
            formDataFiles.append("files", file);
        });

        if (isPending) {
            formDataFiles.append("isPending", "true");
        }

        const response = await fetch(`/api/contractors/${contractor.id}/files`, {
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
            const response = await fetch(`/api/contractors/${contractor.id}/files`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId }),
            });

            if (!response.ok) {
                throw new Error("Ошибка при удалении файла");
            }

            setContractorData(prev => ({
                ...prev,
                files: prev.files.filter(f => f.id !== fileId),
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка удаления файла");
        }
    };



    const handleDeleteContractor = async () => {
        setShowDeleteConfirm(false);
        setIsLoading(true);
        try {
            const response = await fetch(`/api/contractors/${contractor.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка удаления");
            }

            router.push("/clients");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка удаления");
            setIsLoading(false);
        }
    };

    const handleToggleHidden = async () => {
        setShowHideConfirm(false);
        const newHiddenState = !contractorData.isHidden;
        const actionName = newHiddenState ? "скрыть" : "показать";

        setIsLoading(true);
        try {
            const response = await fetch(`/api/contractors/${contractor.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    isHidden: newHiddenState
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `Ошибка при попытке ${actionName}`);
            }

            setContractorData(prev => ({ ...prev, isHidden: newHiddenState }));
            setSuccessMessage(`Контрагент успешно ${newHiddenState ? "скрыт" : "возвращен в активные"}`);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка обновления статуса");
        } finally {
            setIsLoading(false);
        }
    };



    const handleSave = async () => {
        setIsLoading(true);
        setError(null);

        try {

            const uploadedFiles = await uploadFiles(false);

            const response = await fetch(`/api/contractors/${contractor.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при сохранении");
            }

            const updatedContractor = await response.json();

            setContractorData(prev => ({
                ...updatedContractor,
                servicePoints: prev.servicePoints,
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
                { key: "status", label: "Статус" },
                { key: "hasChain", label: "Chain" },
                { key: "primaryCityId", label: "Основной город" },
                { key: "agreementId", label: "Тип договора" },
                { key: "managerId", label: "Менеджер" },
                { key: "generalNotes", label: "Примечания" },
                { key: "generalDescription", label: "Описание" },
                { key: "generalIndividualTerms", label: "Индивидуальные условия" },
            ];

            for (const field of fieldsToCompare) {
                let oldValue: unknown;
                let newValue: unknown = formData[field.key as keyof typeof formData];


                if (field.key === "managerId") {
                    oldValue = contractorData.manager?.id || "";
                } else if (field.key === "primaryCityId") {
                    oldValue = contractorData.primaryCityId || "";
                } else if (field.key === "agreementId") {
                    oldValue = contractorData.agreementId || "";
                } else {
                    oldValue = contractorData[field.key as keyof typeof contractorData];
                }


                const normalizedOld = oldValue === null || oldValue === undefined ? "" : oldValue;
                const normalizedNew = newValue === null || newValue === undefined ? "" : newValue;

                if (normalizedOld !== normalizedNew) {
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


            const spDiff = {
                updates: [] as Array<{ id: string, diff: Record<string, { old: unknown, new: unknown }> }>,
                deletes: [] as string[]
            };


            const currentPointIds = new Set(contractorData.servicePoints.map(sp => sp.id));
            contractor.servicePoints.forEach(originalSp => {
                if (!currentPointIds.has(originalSp.id) || suggestedDeletes.has(originalSp.id)) {
                    spDiff.deletes.push(originalSp.id);
                }
            });


            contractorData.servicePoints.forEach(currentSp => {

                if (suggestedDeletes.has(currentSp.id)) return;

                const originalSp = contractor.servicePoints.find(sp => sp.id === currentSp.id);
                if (originalSp) {
                    const pointDiff: Record<string, { old: unknown, new: unknown }> = {};
                    const spFieldsToCheck = [
                        { key: "name", label: "Название" },
                        { key: "address", label: "Адрес" },
                        { key: "cityId", label: "Город" },
                        { key: "frontsCount", label: "Кол-во фронтов" },
                        { key: "frontsOnService", label: "На обслуживании" },
                        { key: "description", label: "Описание" },
                        { key: "notes", label: "Примечания" },
                        { key: "individualTerms", label: "Индивидуальные условия" },
                        { key: "crmId", label: "CRM ID" },
                    ];

                    spFieldsToCheck.forEach(field => {
                        const key = field.key as keyof ServicePoint;
                        const oldValue = originalSp[key];
                        const newValue = currentSp[key];


                        const normalizedOld = oldValue === null || oldValue === undefined || oldValue === "" ? null : oldValue;
                        const normalizedNew = newValue === null || newValue === undefined || newValue === "" ? null : newValue;

                        if (normalizedOld !== normalizedNew) {
                            pointDiff[field.key] = { old: oldValue, new: newValue };
                        }
                    });


                    const oldAddons = new Set(originalSp.addons.map(a => a.addon.id));
                    const newAddons = new Set(currentSp.addons.map(a => a.addon.id));

                    const addonsChanged =
                        oldAddons.size !== newAddons.size ||
                        [...oldAddons].some(id => !newAddons.has(id));

                    if (addonsChanged) {
                        pointDiff["addonIds"] = {
                            old: Array.from(oldAddons),
                            new: Array.from(newAddons)
                        };
                    }


                    const originalFileIds = originalSp.files.map(f => f.id);
                    const currentFileIds = currentSp.files.map(f => f.id);
                    const deletedFileIds = originalFileIds.filter(id => !currentFileIds.includes(id));
                    const addedFileIds = currentFileIds.filter(id => !originalFileIds.includes(id));

                    console.log("[DEBUG] Point", currentSp.id, "files comparison:");
                    console.log("  Original files:", originalFileIds);
                    console.log("  Current files:", currentFileIds);
                    console.log("  Deleted:", deletedFileIds);
                    console.log("  Added:", addedFileIds);

                    if (deletedFileIds.length > 0 || addedFileIds.length > 0) {
                        pointDiff["files"] = {
                            old: originalFileIds,
                            new: {
                                removed: deletedFileIds,
                                added: addedFileIds
                            }
                        };
                    }

                    if (Object.keys(pointDiff).length > 0) {
                        spDiff.updates.push({ id: currentSp.id, diff: pointDiff });
                    }
                }
            });

            if (spDiff.updates.length > 0 || spDiff.deletes.length > 0) {
                changes["servicePoints"] = {
                    old: null,
                    new: spDiff
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
                    contractorId: contractor.id,
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
                name: contractorData.name,
                inn: contractorData.inn,
                status: contractorData.status,
                hasChain: contractorData.hasChain,
                primaryCityId: contractorData.primaryCityId || "",
                agreementId: contractorData.agreementId || "",
                managerId: contractorData.manager?.id || "",
                generalDescription: contractorData.generalDescription || "",
                generalNotes: contractorData.generalNotes || "",
                generalIndividualTerms: contractorData.generalIndividualTerms || "",
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Произошла ошибка");
        } finally {
            setIsLoading(false);
        }
    };



    const togglePointExpanded = (pointId: string) => {
        setExpandedPoints(prev => {
            const next = new Set(prev);
            if (next.has(pointId)) {
                next.delete(pointId);
            } else {
                next.add(pointId);
            }
            return next;
        });
    };


    const openEditPointDialog = (point: ServicePoint) => {
        setPointFormData({
            name: point.name,
            address: point.address || "",
            cityId: point.cityId || "",
            frontsCount: point.frontsCount,
            frontsOnService: point.frontsOnService,
            description: point.description || "",
            notes: point.notes || "",
            individualTerms: point.individualTerms || "",
            crmId: point.crmId || "",
            addonIds: point.addons.map(a => a.addon.id),
        });
        setPointFiles([]);
        setExistingPointFiles(point.files || []);
        setPointFilesToDelete(new Set());
        setEditingPoint(point);
        setIsCreatingPoint(false);
    };

    const handleAddPoint = () => {
        setPointFormData({
            name: "",
            address: "",
            cityId: contractorData.primaryCityId || "",
            frontsCount: 0,
            frontsOnService: 0,
            description: "",
            notes: "",
            individualTerms: "",
            crmId: "",
            addonIds: [],
        });
        setPointFiles([]);
        setExistingPointFiles([]);
        setPointFilesToDelete(new Set());
        setEditingPoint({ id: "new" } as ServicePoint); // Placeholder
        setIsCreatingPoint(true);
    };


    const handleSavePoint = async () => {
        if (!editingPoint) return;


        if (isCreatingPoint) {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch("/api/service-points", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...pointFormData,
                        contractorId: contractor.id,
                        isPending: isSuggesting,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Ошибка при создании точки");
                }

                const newPoint = await response.json();


                let uploadedFiles: ServicePointFile[] = [];
                if (pointFiles.length > 0) {
                    const formDataFiles = new FormData();
                    pointFiles.forEach(file => formDataFiles.append("files", file));

                    const fileResponse = await fetch(`/api/service-points/${newPoint.id}/files`, {
                        method: "POST",
                        body: formDataFiles,
                    });
                    if (fileResponse.ok) {
                        uploadedFiles = await fileResponse.json();
                    }
                }


                setContractorData(prev => ({
                    ...prev,
                    servicePoints: [...prev.servicePoints, { ...newPoint, files: uploadedFiles }]
                }));

                setEditingPoint(null);
                setIsCreatingPoint(false);
                setPointFiles([]);
                router.refresh();

            } catch (err) {
                setError(err instanceof Error ? err.message : "Ошибка создания точки");
            } finally {
                setIsLoading(false);
            }
            return;
        }


        if (isSuggesting) {
            setIsLoading(true);
            try {

                const remainingFiles = existingPointFiles.filter(f => !pointFilesToDelete.has(f.id));


                let uploadedPendingFiles: ServicePointFile[] = [];
                if (pointFiles.length > 0) {
                    const formDataFiles = new FormData();
                    pointFiles.forEach(file => formDataFiles.append("files", file));
                    formDataFiles.append("isPending", "true");

                    const fileResponse = await fetch(`/api/service-points/${editingPoint.id}/files`, {
                        method: "POST",
                        body: formDataFiles,
                    });
                    if (fileResponse.ok) {
                        uploadedPendingFiles = await fileResponse.json();
                    } else {
                        console.error("Failed to upload pending files:", await fileResponse.text());
                    }
                }


                const newFilesList = [...remainingFiles, ...uploadedPendingFiles];

                setContractorData(prev => ({
                    ...prev,
                    servicePoints: prev.servicePoints.map(sp =>
                        sp.id === editingPoint.id
                            ? {
                                ...sp,
                                ...pointFormData,
                                files: newFilesList
                            }
                            : sp
                    ),
                }));
            } finally {
                setIsLoading(false);
            }
            setEditingPoint(null);
            setPointFiles([]);
            setExistingPointFiles([]);
            setPointFilesToDelete(new Set());
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/service-points/${editingPoint.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...pointFormData,
                    contractorId: contractor.id,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при сохранении точки");
            }

            const updatedPoint = await response.json();


            let uploadedFiles: ServicePointFile[] = [];
            if (pointFiles.length > 0) {
                const formDataFiles = new FormData();
                pointFiles.forEach(file => formDataFiles.append("files", file));

                const fileResponse = await fetch(`/api/service-points/${editingPoint.id}/files`, {
                    method: "POST",
                    body: formDataFiles,
                });
                if (fileResponse.ok) {
                    uploadedFiles = await fileResponse.json();
                }
            }


            for (const fileId of pointFilesToDelete) {
                await fetch(`/api/service-points/${editingPoint.id}/files`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileId }),
                });
            }


            const remainingFiles = existingPointFiles.filter(f => !pointFilesToDelete.has(f.id));
            const newFilesList = [...remainingFiles, ...uploadedFiles];


            setContractorData(prev => ({
                ...prev,
                servicePoints: prev.servicePoints.map(sp =>
                    sp.id === editingPoint.id
                        ? { ...sp, ...updatedPoint, files: newFilesList }
                        : sp
                ),
            }));

            setEditingPoint(null);
            setPointFiles([]);
            setExistingPointFiles([]);
            setPointFilesToDelete(new Set());
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка сохранения точки");
        } finally {
            setIsLoading(false);
        }
    };


    const handleDeletePoint = async () => {
        if (!confirmDeletePoint) return;


        if (isSuggesting) {
            setSuggestedDeletes(prev => {
                const next = new Set(prev);
                next.add(confirmDeletePoint.id);
                return next;
            });
            setConfirmDeletePoint(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/service-points/${confirmDeletePoint.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при удалении точки");
            }


            setContractorData(prev => ({
                ...prev,
                servicePoints: prev.servicePoints.filter(sp => sp.id !== confirmDeletePoint.id),
            }));

            setConfirmDeletePoint(null);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка удаления точки");
        } finally {
            setIsLoading(false);
        }
    };


    const handleRestorePoint = (pointId: string) => {
        setSuggestedDeletes(prev => {
            const next = new Set(prev);
            next.delete(pointId);
            return next;
        });
    };


    const handlePointFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const validFiles: File[] = [];

            newFiles.forEach(file => {
                if (file.size > 50 * 1024 * 1024) {
                    alert(`Файл "${file.name}" превышает лимит 50 МБ и не будет добавлен.`);
                } else {
                    validFiles.push(file);
                }
            });

            if (validFiles.length > 0) {
                setPointFiles(prev => [...prev, ...validFiles]);
            }
        }
    };

    const removePointFile = (index: number) => {
        setPointFiles(prev => prev.filter((_, i) => i !== index));
    };


    const currentStatus = isEditing ? formData.status : contractorData.status;
    const statusConfig = STATUS_CONFIG[currentStatus];
    const StatusIcon = statusConfig.icon;



    return (
        <div className="p-6 max-w-5xl mx-auto">

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (window.history.length > 1 && document.referrer.includes(window.location.origin)) {
                                router.back();
                            } else {
                                router.push("/clients");
                            }
                        }}
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
                            {canHide && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowHideConfirm(true)}
                                    disabled={isLoading}
                                    title={contractorData.isHidden ? "Вернуть в активные" : "Скрыть клиента"}
                                >
                                    {contractorData.isHidden ? (
                                        <>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Показать
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="h-4 w-4 mr-2" />
                                            Скрыть
                                        </>
                                    )}
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={isLoading}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Удалить
                                </Button>
                            )}
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
                                <Button onClick={() => setIsEditing(true)}>
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



            {contractorData.isHidden && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg flex items-center gap-3 mb-5">
                    <EyeOff className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                    <p className="text-yellow-700 dark:text-yellow-400 font-medium">
                        Этот клиент скрыт и виден только менеджерам с соответствующими правами.
                    </p>
                </div>
            )}


            <div className={cn(
                "rounded-xl border-2 p-6 mb-6 transition-all",
                statusConfig.bg,
                statusConfig.border
            )}>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        {(isEditing || isSuggesting) ? (
                            <div className="space-y-3">
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="ООО Название"
                                    className="text-2xl font-bold h-14 bg-background/80"
                                />
                                <div className="flex gap-3">
                                    <Input
                                        value={formData.inn}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 12);
                                            setFormData({ ...formData, inn: val });
                                        }}
                                        placeholder="ИНН (только цифры)"
                                        className="font-mono w-48 bg-background/80"
                                    />
                                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/50 border border-border">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="hasChain"
                                                checked={formData.hasChain}
                                                onCheckedChange={(c) => setFormData({ ...formData, hasChain: c })}
                                                className="data-[state=checked]:bg-purple-600"
                                            />
                                            <label htmlFor="hasChain" className="text-sm cursor-pointer select-none flex items-center gap-1.5 font-medium">
                                                <LinkIcon className="h-4 w-4 text-purple-500" />
                                                Chain
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-foreground mb-1 break-all">{contractorData.name}</h1>
                                <span className="font-mono text-sm text-muted-foreground truncate block max-w-full" title={contractorData.inn}>ИНН {contractorData.inn}</span>
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
                                    "w-[180px] flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all",
                                    "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:outline-none",
                                    "shadow-none outline-none ring-0 cursor-pointer hover:opacity-80 bg-background/80",
                                    statusConfig.border
                                )}>
                                    <StatusIcon className={cn("h-5 w-5", statusConfig.color)} />
                                    <span className={cn("font-bold flex-1 text-left", statusConfig.color)}>
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
                                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 bg-background/50",
                                statusConfig.border
                            )}>
                                <StatusIcon className={cn("h-5 w-5", statusConfig.color)} />
                                <span className={cn("font-bold text-lg", statusConfig.color)}>
                                    {STATUS_LABELS[contractorData.status]}
                                </span>
                            </div>
                        )}
                    </div>
                </div>


                <div className="flex flex-col lg:flex-row lg:items-center gap-4 pt-4 border-t border-white/10">

                    <div className="flex gap-6">
                        <div className="text-center" title="Сервисных точек">
                            <span className={cn("text-3xl font-bold block leading-none", statusConfig.color)}>
                                {contractorData.servicePoints.length}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">точек</span>
                        </div>
                        <div className="text-center" title="Всего фронтов">
                            <span className={cn("text-3xl font-bold block leading-none", statusConfig.color)}>
                                {totalFronts}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">фронтов</span>
                        </div>
                        <div className="text-center" title="На обслуживании">
                            <span className={cn("text-3xl font-bold block leading-none", statusConfig.color)}>
                                {frontsOnService}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">на обсл.</span>
                        </div>
                    </div>


                    <div className="hidden lg:block w-px h-12 bg-white/10" />


                    <div className="flex flex-wrap items-start gap-6 lg:flex-1">

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Город</span>
                            {(isEditing || isSuggesting) ? (
                                <Combobox
                                    items={cityItems}
                                    value={formData.primaryCityId}
                                    onSelect={(val) => setFormData({ ...formData, primaryCityId: val })}
                                    placeholder="Выберите..."
                                    searchPlaceholder="Поиск города..."
                                    className="w-40"
                                />
                            ) : (
                                <span className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    {contractorData.primaryCity?.name || "—"}
                                </span>
                            )}
                        </div>


                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Договор</span>
                            {(isEditing || isSuggesting) ? (
                                <Combobox
                                    items={agreementItems}
                                    value={formData.agreementId}
                                    onSelect={(val) => setFormData({ ...formData, agreementId: val })}
                                    placeholder="Выберите..."
                                    searchPlaceholder="Поиск..."
                                    className="w-44"
                                />
                            ) : (
                                <span className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    {contractorData.agreement?.name || "—"}
                                </span>
                            )}
                        </div>


                        {(contractorData.hasChain && !isEditing && !isSuggesting) && (
                            <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 text-sm font-medium border border-purple-500/20">
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    Сетевой
                                </span>
                            </div>
                        )}


                        <div className="flex-1" />


                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Менеджер</span>
                            {(isEditing || isSuggesting) ? (
                                <Combobox
                                    items={managerItems}
                                    value={formData.managerId}
                                    onSelect={(val) => setFormData({ ...formData, managerId: val })}
                                    placeholder="Выберите..."
                                    searchPlaceholder="Поиск..."
                                    className="w-48"
                                />
                            ) : contractorData.manager ? (
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 ring-2 ring-white/20">
                                        <AvatarImage src={contractorData.manager.avatar || undefined} />
                                        <AvatarFallback className="bg-background/50 text-foreground text-xs">
                                            {contractorData.manager.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-foreground font-medium">{contractorData.manager.name}</span>
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground italic">Не назначен</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

                {(contractor.generalNotes || isEditing || isSuggesting) && (
                    <div className="bg-amber-500/10 rounded-xl border border-amber-500/30 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                Примечания
                            </h3>
                        </div>
                        {(isEditing || isSuggesting) ? (
                            <Textarea
                                value={formData.generalNotes}
                                onChange={(e) => setFormData({ ...formData, generalNotes: e.target.value })}
                                placeholder="Важные заметки..."
                                rows={2}
                                className="bg-background/80"
                            />
                        ) : (
                            <TruncatedText
                                text={contractor.generalNotes}
                                textClassName="text-amber-800 dark:text-amber-200/90 text-sm"
                                maxLength={150}
                                title="Общие примечания"
                            />
                        )}
                    </div>
                )}


                {(contractor.generalIndividualTerms || isEditing || isSuggesting) && (
                    <div className="bg-card rounded-xl border border-border p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Индивидуальные условия
                        </h3>
                        {(isEditing || isSuggesting) ? (
                            <Textarea
                                value={formData.generalIndividualTerms}
                                onChange={(e) => setFormData({ ...formData, generalIndividualTerms: e.target.value })}
                                placeholder="Особые условия договора..."
                                rows={2}
                            />
                        ) : (
                            <TruncatedText
                                text={contractor.generalIndividualTerms}
                                textClassName="text-foreground text-sm"
                                maxLength={150}
                                title="Индивидуальные условия"
                            />
                        )}
                    </div>
                )}
            </div>


            {(contractorData.generalDescription || isEditing || isSuggesting) && (
                <div className="bg-card rounded-xl border border-border p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Описание
                        </h3>
                    </div>
                    {(isEditing || isSuggesting) ? (
                        <Textarea
                            value={formData.generalDescription}
                            onChange={(e) => setFormData({ ...formData, generalDescription: e.target.value })}
                            placeholder="Подробное описание контрагента..."
                            rows={4}
                        />
                    ) : (
                        <TruncatedText
                            text={contractorData.generalDescription}
                            textClassName="text-foreground text-sm"
                            maxLength={300}
                            title="Общее описание"
                        />
                    )}
                </div>
            )}


            <div className="bg-card rounded-xl border border-border p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Точки ({contractorData.servicePoints.length})
                    </h3>
                    {isEditing && (
                        <Button size="sm" variant="outline" onClick={handleAddPoint}>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить точку
                        </Button>
                    )}
                </div>

                {contractorData.servicePoints.length === 0 ? (
                    <p className="text-muted-foreground italic text-center py-8">
                        Нет точек. {isEditing && "Добавьте первую точку."}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {contractorData.servicePoints.map((point) => {
                            const isExpanded = expandedPoints.has(point.id);
                            const isSuggestedDeleted = suggestedDeletes.has(point.id);
                            const serviceRatio = point.frontsCount > 0 ? point.frontsOnService / point.frontsCount : 0;

                            return (
                                <div
                                    key={point.id}
                                    className={cn(
                                        "rounded-lg overflow-hidden transition-all border",
                                        isSuggestedDeleted
                                            ? "border-red-400/50 bg-red-950/20"
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
                                            title={`${Math.round(serviceRatio * 100)}% на обслуживании`}
                                        />


                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={cn(
                                                    "font-medium truncate",
                                                    isSuggestedDeleted ? "text-red-500 line-through" : "text-foreground"
                                                )}>
                                                    {point.name}
                                                </span>
                                                {isSuggestedDeleted && (
                                                    <span className="text-[10px] font-bold text-red-500 uppercase bg-red-500/20 px-1.5 py-0.5 rounded shrink-0">
                                                        К удалению
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


                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
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


                                            {
                                                point.addons.length > 0 && (
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
                                                                        border: `1px solid ${addon.color ? `${addon.color}40` : "rgba(0,0,0,0.15)"}`,
                                                                    }}
                                                                >
                                                                    {addon.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            }


                                            {
                                                point.files && point.files.length > 0 && (
                                                    <div>
                                                        <span className="text-[10px] text-muted-foreground uppercase block mb-2">
                                                            Файлы ({point.files.length})
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {point.files.map((file) => (
                                                                <button
                                                                    key={file.id}
                                                                    onClick={() => setPreviewFile(file as unknown as ContractorFile)}
                                                                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-muted border border-border hover:bg-muted/80 transition-colors"
                                                                >
                                                                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="truncate max-w-[120px]">{file.filename}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            }


                                            {(isEditing || isSuggesting) && (
                                                <div className="flex gap-2 pt-2 border-t border-border">
                                                    {isSuggestedDeleted ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRestorePoint(point.id);
                                                            }}
                                                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                                            Восстановить
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button size="sm" variant="outline" onClick={() => openEditPointDialog(point)}>
                                                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                                                Редактировать
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-destructive hover:bg-destructive/10"
                                                                onClick={() => setConfirmDeletePoint(point)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                                                Удалить
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
                }
            </div >


            < div className="bg-card rounded-xl border border-border p-5" >
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Файлы контрагента ({contractorData.files?.length || 0})
                </h3>

                {
                    (contractorData.files?.length || 0) > 0 || selectedFiles.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">

                            {contractorData.files?.map((file) => {
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
                                );
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
                    )
                }

                {
                    canEdit && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                multiple
                                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                                onChange={(e) => { if (!isEditing) setIsEditing(true); handleFileSelect(e); }}
                            />
                            <Button
                                variant="outline"
                                onClick={() => { if (!isEditing) setIsEditing(true); fileInputRef.current?.click(); }}
                                className="w-full border-dashed"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Добавить файлы
                            </Button>
                        </>
                    )
                }
            </div >

            <FilePreviewDialog
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
            />


            <Dialog open={!!editingPoint} onOpenChange={(open) => !open && setEditingPoint(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isCreatingPoint ? "Новая точка обслуживания" : "Редактирование точки обслуживания"}</DialogTitle>
                        <DialogDescription className="break-all">
                            {editingPoint?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Название точки *</label>
                                <Input
                                    value={pointFormData.name}
                                    onChange={(e) => setPointFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Название точки"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Город</label>
                                <Combobox
                                    items={cityItems}
                                    value={pointFormData.cityId}
                                    onSelect={(val) => setPointFormData(prev => ({ ...prev, cityId: val }))}
                                    placeholder="Выберите город"
                                    searchPlaceholder="Поиск города..."
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Адрес</label>
                            <Input
                                value={pointFormData.address}
                                onChange={(e) => setPointFormData(prev => ({ ...prev, address: e.target.value }))}
                                placeholder="Адрес точки"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">CRM ID</label>
                            <Input
                                value={pointFormData.crmId}
                                onChange={(e) => setPointFormData(prev => ({ ...prev, crmId: e.target.value }))}
                                placeholder="Например: 12345"
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Кол-во фронтов</label>
                                <Input
                                    type="number"
                                    value={pointFormData.frontsCount}
                                    onChange={(e) => {
                                        const newVal = parseInt(e.target.value) || 0;
                                        setPointFormData(prev => ({
                                            ...prev,
                                            frontsCount: newVal,

                                            frontsOnService: Math.min(prev.frontsOnService, newVal)
                                        }));
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">На обслуживании</label>
                                <Input
                                    type="number"
                                    value={pointFormData.frontsOnService}
                                    onChange={(e) => {
                                        const newVal = parseInt(e.target.value) || 0;

                                        if (newVal <= pointFormData.frontsCount) {
                                            setPointFormData(prev => ({ ...prev, frontsOnService: newVal }));
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Описание</label>
                            <Textarea
                                value={pointFormData.description}
                                onChange={(e) => setPointFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Описание точки"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Примечания</label>
                            <Textarea
                                value={pointFormData.notes}
                                onChange={(e) => setPointFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Примечания"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Индивидуальные условия</label>
                            <Textarea
                                value={pointFormData.individualTerms}
                                onChange={(e) => setPointFormData(prev => ({ ...prev, individualTerms: e.target.value }))}
                                placeholder="Индивидуальные условия"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Дополнения</label>
                            <AddonSelector
                                allAddons={allAddons}
                                selectedAddonIds={pointFormData.addonIds}
                                onChange={(ids) => setPointFormData(prev => ({ ...prev, addonIds: ids }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Файлы точки ({existingPointFiles.length + pointFiles.length})</label>


                            {existingPointFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {existingPointFiles.map((file) => {
                                        const isDeleted = pointFilesToDelete.has(file.id);
                                        return (
                                            <div
                                                key={file.id}
                                                className={cn(
                                                    "flex items-center gap-2 rounded px-2 py-1 text-sm border",
                                                    isDeleted
                                                        ? "bg-destructive/10 border-destructive/30 line-through opacity-60"
                                                        : "bg-muted border-border"
                                                )}
                                            >
                                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                                <span className="truncate max-w-[120px]">{file.filename}</span>
                                                <button
                                                    onClick={() => setPointFilesToDelete(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(file.id)) next.delete(file.id);
                                                        else next.add(file.id);
                                                        return next;
                                                    })}
                                                    className={cn(
                                                        "hover:opacity-80",
                                                        isDeleted ? "text-emerald-600" : "text-destructive"
                                                    )}
                                                >
                                                    {isDeleted ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}


                            {pointFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {pointFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded px-2 py-1 text-sm">
                                            <span className="text-emerald-600 text-xs">NEW</span>
                                            <span className="truncate max-w-[120px]">{file.name}</span>
                                            <button onClick={() => removePointFile(idx)} className="text-destructive hover:text-destructive/80">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}


                            <input
                                ref={pointFileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                accept="image/*,video/*,.pdf,.doc,.docx"
                                onChange={handlePointFileSelect}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => pointFileInputRef.current?.click()}
                                className="w-full border-dashed"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Добавить файлы
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPoint(null)}>
                            Отмена
                        </Button>
                        <Button onClick={handleSavePoint} disabled={isLoading || !pointFormData.name}>
                            {isLoading ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <Dialog open={!!confirmDeletePoint} onOpenChange={(open) => !open && setConfirmDeletePoint(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить точку обслуживания?</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить точку <span className="inline-block align-bottom max-w-[200px] truncate font-medium align-sub" title={confirmDeletePoint?.name}>"{confirmDeletePoint?.name}"</span>?
                            Это действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDeletePoint(null)}>
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={handleDeletePoint} disabled={isLoading}>
                            {isLoading ? "Удаление..." : "Удалить"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Удаление клиента</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить контрагента <span className="inline-block align-bottom max-w-[200px] truncate font-medium align-sub" title={contractorData.name}>«{contractorData.name}»</span>?
                            Это действие нельзя отменить. Все связанные данные будут удалены.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteContractor} disabled={isLoading}>
                            {isLoading ? "Удаление..." : "Удалить"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <Dialog open={showHideConfirm} onOpenChange={setShowHideConfirm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {contractorData.isHidden ? "Показать клиента" : "Скрыть клиента"}
                        </DialogTitle>
                        <DialogDescription>
                            {contractorData.isHidden ? (
                                <span>
                                    Вы уверены, что хотите вернуть контрагента <span className="inline-block align-bottom max-w-[200px] truncate font-medium align-sub" title={contractorData.name}>«{contractorData.name}»</span> в активные? Он снова будет виден всем пользователям.
                                </span>
                            ) : (
                                <span>
                                    Вы уверены, что хотите скрыть контрагента <span className="inline-block align-bottom max-w-[200px] truncate font-medium align-sub" title={contractorData.name}>«{contractorData.name}»</span>? Он будет виден только менеджерам с правами на просмотр скрытых клиентов.
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowHideConfirm(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleToggleHidden} disabled={isLoading}>
                            {isLoading ? "Обработка..." : (contractorData.isHidden ? "Показать" : "Скрыть")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
                Создал: {contractorData.createdBy?.name || "Система"} • {new Date(contractorData.createdAt).toLocaleDateString("ru-RU")}
                {contractorData.updatedAt && contractorData.updatedAt !== contractorData.createdAt && (
                    <span> • Обновлено: {new Date(contractorData.updatedAt).toLocaleDateString("ru-RU")}</span>
                )}
            </div>
        </div >
    );
}
