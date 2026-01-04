"use client";

import type { ServiceStatus } from "@/generated/prisma/enums.js";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { STATUS_LABELS, cn } from "@/lib/utils";
import { Link as LinkIcon, MapPin, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface ContractorCardProps {
    contractor: {
        id: string;
        name: string;
        inn: string;
        status: ServiceStatus;
        hasChain: boolean;
        totalFronts: number;
        frontsOnService: number;
        servicePointsCount: number;
        generalNotes: string | null;
        primaryCity: {
            id: string;
            name: string;
        } | null;
        agreement: {
            id: string;
            name: string;
        } | null;
        manager: {
            id: string;
            name: string;
            avatar: string | null;
        } | null;
        allAddons: {
            id: string;
            name: string;
            color: string | null;
        }[];
    };
}

const STATUS_STYLES: Record<ServiceStatus, {
    card: string;
    border: string;
    badge: string;
    statNumber: string;
}> = {
    ACTIVE: {
        card: "bg-emerald-950/50",
        border: "border-emerald-600/60",
        badge: "bg-emerald-600 text-white",
        statNumber: "text-emerald-400",
    },
    DEBT: {
        card: "bg-orange-950/50",
        border: "border-orange-600/60",
        badge: "bg-orange-600 text-white",
        statNumber: "text-orange-400",
    },
    LEFT: {
        card: "bg-red-950/50",
        border: "border-red-600/60",
        badge: "bg-red-600 text-white",
        statNumber: "text-red-400",
    },
    CLOSED: {
        card: "bg-red-950/60",
        border: "border-red-500/70",
        badge: "bg-red-700 text-white",
        statNumber: "text-red-400",
    },
    NO_CONTRACT: {
        card: "bg-pink-950/50",
        border: "border-pink-600/60",
        badge: "bg-pink-600 text-white",
        statNumber: "text-pink-400",
    },
    SEASONAL: {
        card: "bg-slate-900/70",
        border: "border-slate-600/60",
        badge: "bg-slate-600 text-white",
        statNumber: "text-slate-400",
    },
    LAUNCHING: {
        card: "bg-lime-950/50",
        border: "border-lime-600/60",
        badge: "bg-lime-600 text-white",
        statNumber: "text-lime-400",
    },
};

export function ContractorCard({ contractor }: ContractorCardProps) {
    const styles = STATUS_STYLES[contractor.status];

    return (
        <Link
            href={`/clients/${contractor.id}`}
            className={cn(
                "group flex flex-col rounded-xl border p-4 h-full",
                "transition-all duration-200",
                "hover:shadow-xl hover:-translate-y-0.5 hover:border-opacity-100",
                styles.card,
                styles.border
            )}
        >

            <div className="flex items-start justify-between gap-3 mb-2">
                <h3
                    className="text-base font-bold leading-snug line-clamp-2 text-white"
                    title={`${contractor.name}\nИНН: ${contractor.inn}`}
                >
                    {contractor.name}
                </h3>
                <Badge className={cn(
                    "text-[10px] shrink-0 whitespace-nowrap border-0 px-2 py-0.5 font-semibold",
                    styles.badge
                )}>
                    {STATUS_LABELS[contractor.status]}
                </Badge>
            </div>


            <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-3">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                    {contractor.primaryCity?.name || "—"}
                </span>
                {contractor.hasChain && (
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-[10px] font-semibold border border-purple-500/25">
                        <LinkIcon className="w-2.5 h-2.5" />
                        Сетевой
                    </span>
                )}
            </div>


            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex gap-3">
                    <div className="text-center" title="Сервисных точек">
                        <span className={cn("text-2xl font-bold block leading-none", styles.statNumber)}>
                            {contractor.servicePointsCount}
                        </span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wide">точек</span>
                    </div>
                    <div className="text-center" title="Всего фронтов">
                        <span className={cn("text-2xl font-bold block leading-none", styles.statNumber)}>
                            {contractor.totalFronts}
                        </span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wide">фронтов</span>
                    </div>
                    <div className="text-center" title="На обслуживании">
                        <span className={cn("text-2xl font-bold block leading-none", styles.statNumber)}>
                            {contractor.frontsOnService}
                        </span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wide">на обсл.</span>
                    </div>
                </div>
            </div>


            {contractor.generalNotes && (
                <div className="flex gap-2 rounded-md p-2 mb-3 bg-amber-900/30 border border-amber-700/40">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                    <p className="text-xs line-clamp-2 text-amber-200/90">
                        {contractor.generalNotes}
                    </p>
                </div>
            )}


            <div className="mt-auto pt-3 border-t border-white/10">
                {contractor.manager ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                            {contractor.manager.avatar && (
                                <AvatarImage src={contractor.manager.avatar} />
                            )}
                            <AvatarFallback className="text-[9px] font-semibold bg-gray-700 text-gray-300">
                                {contractor.manager.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-400 truncate">
                            {contractor.manager.name}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs italic text-gray-600">Менеджер не назначен</span>
                )}
            </div>
        </Link>
    );
}
