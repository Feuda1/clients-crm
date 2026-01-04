"use client";

import { useSession } from "next-auth/react";
import { DictionaryList } from "./dictionary-list";
import { hasPermission } from "@/lib/utils";

export function CityList() {
    const { data: session } = useSession();
    const canManage = session?.user?.permissions && hasPermission(session.user.permissions, "MANAGE_CITIES");

    return (
        <DictionaryList
            title="Города"
            description="Список городов обслуживания клиентов"
            endpoint="/api/cities"
            singularName="город"
            canManage={canManage}
        />
    );
}
