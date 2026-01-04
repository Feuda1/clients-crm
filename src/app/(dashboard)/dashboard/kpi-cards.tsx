import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Users, Building2, TrendingUp, AlertCircle, Store } from "lucide-react";
import { AnalyticsStats } from "@/app/actions/analytics";

interface KpiCardsProps {
    stats: AnalyticsStats;
    isLoading: boolean;
}

export function KpiCards({ stats, isLoading }: KpiCardsProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-muted rounded"></div>
                            <div className="h-4 w-4 bg-muted rounded-full"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-muted rounded mb-1"></div>
                            <div className="h-3 w-32 bg-muted rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/clients" className="block transition-transform hover:scale-105">
                <Card className="h-full hover:bg-accent/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего клиентов</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalClients}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.activeClients} на договоре
                        </p>
                    </CardContent>
                </Card>
            </Link>

            <Link href="/clients" className="block transition-transform hover:scale-105">
                <Card className="h-full hover:bg-accent/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Точки обслуживания</CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPoints}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.activePoints} фронтов на обслуживании
                        </p>
                    </CardContent>
                </Card>
            </Link>

            <Link href="/clients?status=ACTIVE" className="block transition-transform hover:scale-105">
                <Card className="h-full hover:bg-accent/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Активность</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.round((stats.activeClients / (stats.totalClients || 1)) * 100)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Конверсия в активных
                        </p>
                    </CardContent>
                </Card>
            </Link>

            <Link href="/clients?status=DEBT" className="block transition-transform hover:scale-105">
                <Card className="h-full hover:bg-accent/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Проблемные</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.clientsByStatus["DEBT"] || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Имеют долги или проблемы
                        </p>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}
