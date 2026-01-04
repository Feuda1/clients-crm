"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileData {
    id: string;
    filename: string;
    storagePath: string;
    fileType: string;
    mimeType?: string;
    size?: number;
}

interface FilePreviewDialogProps {
    file: FileData | null;
    isOpen: boolean;
    onClose: () => void;
}

export function FilePreviewDialog({ file, isOpen, onClose }: FilePreviewDialogProps) {
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && file) {
            setContent(null);
            setError(null);

            if (
                file.mimeType?.startsWith("text/") ||
                file.filename.endsWith(".txt") ||
                file.filename.endsWith(".json") ||
                file.filename.endsWith(".md") ||
                file.filename.endsWith(".csv")
            ) {
                setIsLoading(true);
                fetch(file.storagePath)
                    .then(async (res) => {
                        if (!res.ok) throw new Error("Не удалось загрузить файл");
                        return res.text();
                    })
                    .then((text) => setContent(text))
                    .catch((err) => setError("Ошибка загрузки содержимого"))
                    .finally(() => setIsLoading(false));
            }
        }
    }, [isOpen, file]);

    if (!file) return null;

    const handleDownload = () => {
        window.location.href = `/api/download?fileId=${file.id}`;
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p>Загрузка предпросмотра...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-red-500">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>{error}</p>
                </div>
            );
        }

        const { fileType, mimeType, storagePath } = file;

        if (fileType === "image" || mimeType?.startsWith("image/")) {
            return (
                <div className="flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                    <img
                        src={storagePath}
                        alt={file.filename}
                        className="max-h-[70vh] max-w-full object-contain"
                    />
                </div>
            );
        }

        if (fileType === "video" || mimeType?.startsWith("video/")) {
            return (
                <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden">
                    <video
                        src={storagePath}
                        controls
                        className="max-h-[70vh] max-w-full"
                    />
                </div>
            );
        }

        if (mimeType === "application/pdf" || file.filename.endsWith(".pdf")) {
            return (
                <iframe
                    src={storagePath}
                    className="w-full h-[70vh] rounded-lg border border-border"
                    title="PDF Preview"
                />
            );
        }

        if (content !== null) {
            return (
                <div className="bg-muted p-4 rounded-lg overflow-auto max-h-[70vh] w-full">
                    <pre className="text-sm font-mono whitespace-pre-wrap break-words text-foreground">
                        {content}
                    </pre>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-lg">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4 text-center">
                    Предпросмотр для этого типа файла недоступен.<br />
                    Пожалуйста, скачайте файл для просмотра.
                </p>
                <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Скачать файл
                </Button>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 [&>button]:hidden">
                <DialogHeader className="flex-row items-center justify-between space-y-0 pb-4 border-b">
                    <DialogTitle className="text-xl truncate pr-8" title={file.filename}>
                        {file.filename}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleDownload}>
                            <Download className="h-4 w-4 mr-2" />
                            Скачать
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onClose} className="h-9 w-9 p-0">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4 min-h-[300px] flex items-center justify-center">
                    {renderContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
}
