import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface TruncatedTextProps {
    text: string | null | undefined;
    maxLength?: number;
    title?: string;
    className?: string;
    textClassName?: string;
}

export function TruncatedText({
    text,
    maxLength = 100,
    title = "Просмотр текста",
    className,
    textClassName
}: TruncatedTextProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!text) return null;

    const shouldTruncate = text.length > maxLength;
    const displayText = shouldTruncate ? text.slice(0, maxLength).trim() + "..." : text;

    if (!shouldTruncate) {
        return <p className={cn("whitespace-pre-wrap break-words", textClassName)}>{text}</p>;
    }

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className={cn(
                    "group cursor-pointer hover:bg-muted/50 rounded -ml-2 p-2 transition-colors",
                    className
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        setIsOpen(true);
                    }
                }}
            >
                <div className="flex items-start gap-1">
                    <p className={cn("whitespace-pre-wrap break-words line-clamp-3", textClassName)}>
                        {displayText}
                    </p>
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-end mb-1 whitespace-nowrap flex items-center">
                        Читать дальше <ChevronRight className="h-3 w-3" />
                    </span>
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-full">
                    <DialogHeader>
                        <DialogTitle className="break-all whitespace-pre-wrap text-left leading-snug pr-8 text-foreground w-full">
                            {title}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="mt-4 w-full overflow-hidden whitespace-pre-wrap break-words break-all text-sm leading-relaxed text-foreground">
                        {text}
                    </DialogDescription>
                </DialogContent>
            </Dialog>
        </>
    );
}
