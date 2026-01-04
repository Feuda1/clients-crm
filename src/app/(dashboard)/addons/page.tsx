"use client";

import { useSession } from "next-auth/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AddonList } from "@/app/(dashboard)/addons/addon-list";
import { CityList } from "@/app/(dashboard)/addons/city-list";
import { AgreementList } from "@/app/(dashboard)/addons/agreement-list";
import { hasPermission } from "@/lib/utils";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AddonsPage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const permissions = session?.user?.permissions || [];
    const isAdmin = hasPermission(permissions, "ADMIN");

    const canManageAddons = isAdmin || hasPermission(permissions, "MANAGE_ADDONS");
    const canManageCities = isAdmin || hasPermission(permissions, "MANAGE_CITIES");
    const canManageAgreements = isAdmin || hasPermission(permissions, "MANAGE_AGREEMENTS");

    const availableTabs = [
        canManageAddons && { value: "addons", label: "Дополнения", component: <AddonList /> },
        canManageCities && { value: "cities", label: "Города", component: <CityList /> },
        canManageAgreements && { value: "agreements", label: "Договоры", component: <AgreementList /> },
    ].filter(Boolean) as { value: string; label: string; component: React.ReactNode }[];

    if (availableTabs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-bold text-foreground">Запрещено</h2>
                <p className="text-muted-foreground mt-2 max-w-md">
                    У вас нет прав для просмотра этого раздела. Обратитесь к администратору, если считаете, что это ошибка.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-foreground">Справочники</h1>
            <Tabs defaultValue={availableTabs[0].value} className="space-y-6">
                <TabsList>
                    {availableTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {availableTabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} className="outline-none">
                        {tab.component}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
