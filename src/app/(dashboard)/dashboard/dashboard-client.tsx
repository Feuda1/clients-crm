"use client";

import { useState, useEffect } from "react";
import { addDays, format, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { DatePickerWithRange } from "@/components/date-range-picker";


import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { getDashboardStats, AnalyticsStats } from "@/app/actions/analytics";
import { OverviewCharts } from "./overview-charts";
import { KpiCards } from "./kpi-cards";

type DateRange = {
    from: Date | undefined;
    to?: Date | undefined;
};

interface DashboardClientProps {
    canViewGeneral: boolean;
    canViewOwn: boolean;
    userId: string;
}

export function DashboardClient({ canViewGeneral, canViewOwn }: DashboardClientProps) {
    const [date, setDate] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 1),
        to: new Date(),
    });

    const [activeTab, setActiveTab] = useState<string>(
        canViewGeneral ? "general" : "own"
    );

    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!date?.from || !date?.to) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await getDashboardStats(
                date.from,
                date.to,
                activeTab as "general" | "own"
            );

            if (result.success && result.data) {
                setStats(result.data);
            } else {
                setError(result.error || "Ошибка загрузки данных");
            }
        } catch (err) {
            setError("Произошла ошибка при получении данных");
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchData();
    }, [date, activeTab]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="space-y-4"
                >
                    <TabsList>
                        {canViewGeneral && <TabsTrigger value="general">Общая статистика</TabsTrigger>}
                        {canViewOwn && <TabsTrigger value="own">Моя статистика</TabsTrigger>}
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                    <DatePickerWithRange
                        date={date}
                        setDate={setDate}
                    />

                    <Button variant="ghost" size="icon" onClick={fetchData} disabled={isLoading}>
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {stats ? (
                    <>
                        <KpiCards stats={stats} isLoading={isLoading} />
                        <OverviewCharts stats={stats} isLoading={isLoading} scope={activeTab} />
                    </>
                ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        Загрузка статистики...
                    </div>
                )}
            </div>
        </div>
    );
}
