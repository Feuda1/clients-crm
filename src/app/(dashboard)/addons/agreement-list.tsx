"use client";

import { useSession } from "next-auth/react";
import { DictionaryList } from "./dictionary-list";
import { hasPermission } from "@/lib/utils";

export function AgreementList() {
    const { data: session } = useSession();
    const canManage = session?.user?.permissions && hasPermission(session.user.permissions, "MANAGE_AGREEMENTS");

    return (
        <DictionaryList
            title="Типы договоров"
            description="Справочник вариантов договорных отношений"
            endpoint="/api/agreements"
            singularName="тип договора"
            canManage={canManage}
        />
    );
}
