"use client";

import type { ServiceStatus } from "@/generated/prisma/enums.js";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { STATUS_LABELS, cn } from "@/lib/utils";
import { Link as LinkIcon } from "lucide-react";
import Link from "next/link";

interface ClientCardProps {
    client: {
        id: string;
        name: string;
        inn: string;
        contractor: string;
        city: string;
        status: ServiceStatus;
        hasChain: boolean;
        frontsCount: number;
        frontsOnService: number | null;
        notes: string | null;
        manager: {
            id: string;
            name: string;
            avatar: string | null;
        } | null;
        addons: {
            addon: {
                id: string;
                name: string;
                color: string | null;
            };
        }[];
    };
    onClick?: () => void;
}

const STATUS_STYLES: Record<ServiceStatus, {
    card: string;
    cardHover: string;
    border: string;
    divider: string;
    badge: string;
}> = {
    ACTIVE: {
        card: "bg-emerald-50 dark:bg-emerald-950/40",
        cardHover: "hover:bg-emerald-100 dark:hover:bg-emerald-950/60",
        border: "border-emerald-200 dark:border-emerald-800",
        divider: "border-emerald-200/60 dark:border-emerald-800/40",
        badge: "bg-emerald-600 text-white",
    },
    DEBT: {
        card: "bg-orange-50 dark:bg-orange-950/40",
        cardHover: "hover:bg-orange-100 dark:hover:bg-orange-950/60",
        border: "border-orange-200 dark:border-orange-800",
        divider: "border-orange-200/60 dark:border-orange-800/40",
        badge: "bg-orange-600 text-white",
    },
    LEFT: {
        card: "bg-red-50 dark:bg-red-950/40",
        cardHover: "hover:bg-red-100 dark:hover:bg-red-950/60",
        border: "border-red-200 dark:border-red-800",
        divider: "border-red-200/60 dark:border-red-800/40",
        badge: "bg-red-600 text-white",
    },
    CLOSED: {
        card: "bg-red-100 dark:bg-red-950/50",
        cardHover: "hover:bg-red-150 dark:hover:bg-red-950/70",
        border: "border-red-300 dark:border-red-700",
        divider: "border-red-300/60 dark:border-red-700/40",
        badge: "bg-red-700 text-white",
    },
    NO_CONTRACT: {
        card: "bg-pink-50 dark:bg-pink-950/40",
        cardHover: "hover:bg-pink-100 dark:hover:bg-pink-950/60",
        border: "border-pink-200 dark:border-pink-800",
        divider: "border-pink-200/60 dark:border-pink-800/40",
        badge: "bg-pink-600 text-white",
    },
    SEASONAL: {
        card: "bg-slate-50 dark:bg-slate-900/60",
        cardHover: "hover:bg-slate-100 dark:hover:bg-slate-900/80",
        border: "border-slate-200 dark:border-slate-700",
        divider: "border-slate-200/60 dark:border-slate-700/40",
        badge: "bg-slate-600 text-white",
    },
    LAUNCHING: {
        card: "bg-lime-50 dark:bg-lime-950/40",
        cardHover: "hover:bg-lime-100 dark:hover:bg-lime-950/60",
        border: "border-lime-200 dark:border-lime-800",
        divider: "border-lime-200/60 dark:border-lime-800/40",
        badge: "bg-lime-600 text-white",
    },
};

export function ClientCard({ client, onClick }: ClientCardProps) {
    const styles = STATUS_STYLES[client.status];

    return (
        <Link
            href={`/clients/${client.id}`}
            className={cn(
                "flex flex-col rounded-xl border p-4 transition-all duration-200 h-full",
                "hover:shadow-lg hover:scale-[1.01]",
                "cursor-pointer select-none",
                styles.card,
                styles.cardHover,
                styles.border
            )}
        >

            <div className="mb-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-lg font-bold leading-tight line-clamp-1 text-foreground" title={client.name}>
                        {client.name}
                    </h3>
                    <Badge className={cn("text-xs shrink-0 whitespace-nowrap border-0", styles.badge)}>
                        {STATUS_LABELS[client.status]}
                    </Badge>
                </div>
                <p className="text-sm truncate text-muted-foreground">{client.contractor}</p>
            </div>


            <div className={cn("py-3 border-t", styles.divider)}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <span className="text-[10px] uppercase tracking-wide font-medium block mb-0.5 text-muted-foreground">
                            ИНН
                        </span>
                        <span className="text-sm font-mono font-medium text-foreground">
                            {client.inn}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-wide font-medium block mb-0.5 text-muted-foreground">
                            Город
                        </span>
                        <span className="text-sm font-medium text-foreground">
                            {client.city}
                        </span>
                    </div>
                </div>
            </div>


            <div className={cn("py-3 border-t min-h-[60px]", styles.divider)}>
                <span className="text-[10px] uppercase tracking-wide font-medium block mb-2 text-muted-foreground">
                    Дополнения
                </span>
                {(client.hasChain || client.addons.length > 0) ? (
                    <div className="flex flex-wrap gap-1.5">
                        {client.hasChain && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-500/30">
                                <LinkIcon className="w-3 h-3" />
                                Chain
                            </span>
                        )}
                        {client.addons.slice(0, 3).map(({ addon }) => (
                            <span
                                key={addon.id}
                                title={addon.name}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium max-w-[100px] truncate"
                                style={{
                                    backgroundColor: addon.color ? `${addon.color}20` : "rgba(0,0,0,0.1)",
                                    color: addon.color || "inherit",
                                    border: `1px solid ${addon.color ? `${addon.color}40` : "rgba(0,0,0,0.15)"}`,
                                }}
                            >
                                {addon.name}
                            </span>
                        ))}
                        {client.addons.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-black/5 dark:bg-white/10 text-current">
                                +{client.addons.length - 3}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-xs italic opacity-50 text-muted-foreground">Нет</span>
                )}
            </div>


            <div className={cn("py-3 border-t min-h-[50px]", styles.divider)}>
                <span className="text-[10px] uppercase tracking-wide font-medium block mb-1 text-muted-foreground">
                    Примечание
                </span>
                {client.notes ? (
                    <p className="text-xs line-clamp-2 text-foreground">{client.notes}</p>
                ) : (
                    <span className="text-xs italic opacity-50 text-muted-foreground">Нет</span>
                )}
            </div>


            <div className={cn("pt-3 border-t mt-auto", styles.divider)}>
                <span className="text-[10px] uppercase tracking-wide font-medium block mb-1.5 text-muted-foreground">
                    Менеджер
                </span>
                {client.manager ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                            {client.manager.avatar && (
                                <AvatarImage src={client.manager.avatar} />
                            )}
                            <AvatarFallback className="text-[10px] bg-black/10 dark:bg-white/10">
                                {client.manager.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate text-foreground">
                            {client.manager.name}
                        </span>
                    </div>
                ) : (
                    <span className="text-sm italic opacity-60 text-muted-foreground">Не назначен</span>
                )}
            </div>
        </Link>
    );
}

