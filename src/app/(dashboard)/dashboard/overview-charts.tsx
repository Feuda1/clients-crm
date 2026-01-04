"use client";

import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AnalyticsStats } from "@/app/actions/analytics";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OverviewChartsProps {
    stats: AnalyticsStats;
    isLoading: boolean;
    scope: string;
}

const COLORS = [
    "#10b981", // active - emerald-500
    "#ef4444", // closed - red-500
    "#ec4899", // no_contract - pink-500
    "#6b7280", // left - gray-500
    "#84cc16", // launching - lime-500
    "#f97316", // debt - orange-500
    "#64748b", // seasonal - slate-500
];

const STATUS_COLOR_MAP: Record<string, string> = {
    ACTIVE: "#10b981", // emerald-500 (Green)
    CLOSED: "#64748b", // slate-500 (Gray)
    NO_CONTRACT: "#ec4899", // pink-500 (Pink)
    LEFT: "#ef4444", // red-500 (Red)
    SEASONAL: "#f59e0b", // amber-500 (Orange/Yellow for seasonal)
    LAUNCHING: "#3b82f6", // blue-500 (Blue for launching - distinct from green)
    DEBT: "#f97316", // orange-500 (Orange for debt)
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-sm">
                <p className="font-medium mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color || entry.fill }}
                        />
                        <span className="text-muted-foreground">{entry.name}:</span>
                        <span className="font-medium">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function OverviewCharts({ stats, isLoading, scope }: OverviewChartsProps) {
    if (isLoading) return null;


    const pieData = Object.entries(stats.clientsByStatus).map(([status, count]) => ({
        name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
        value: count,
        color: STATUS_COLOR_MAP[status] || "#8884d8",
    })).filter(item => item.value > 0);


    const barData = stats.clientsByMonth.map(item => ({
        name: item.date,
        total: item.count,
    }));

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Динамика новых клиентов</CardTitle>
                    <CardDescription>
                        Количество новых контрагентов по месяцам за выбранный период
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                                <XAxis
                                    dataKey="name"
                                    stroke="currentColor"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-muted-foreground"
                                />
                                <YAxis
                                    stroke="currentColor"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                    className="text-muted-foreground"
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ fill: "transparent" }}
                                    isAnimationActive={false}
                                />
                                <Bar
                                    dataKey="total"
                                    name="Всего"
                                    fill="#3b82f6"
                                    radius={[4, 4, 0, 0]}
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>


            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Статусы клиентов</CardTitle>
                    <CardDescription>
                        Распределение клиентской базы по текущему статусу
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    isAnimationActive={false}
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {pieData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1.5 text-xs">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-muted-foreground">{entry.name} ({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>


            {scope === "general" && stats.topManagers && (
                <Card className="col-span-4 lg:col-span-7">
                    <CardHeader>
                        <CardTitle>Топ менеджеров</CardTitle>
                        <CardDescription>
                            Лидеры по количеству созданных клиентов за период
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.topManagers.map((manager, index) => (
                                <div key={index} className="flex items-center">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={manager.avatar || undefined} alt={manager.name} />
                                        <AvatarFallback>
                                            {manager.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{manager.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Менеджер
                                        </p>
                                    </div>
                                    <div className="font-medium pl-4 text-muted-foreground">+{manager.count}</div>
                                </div>
                            ))}
                            {stats.topManagers.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">Данных пока нет</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
