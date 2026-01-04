import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const PERMISSIONS = {
    ADMIN: "ADMIN",
    CREATE_USER: "CREATE_USER",
    CREATE_CLIENT: "CREATE_CLIENT",
    EDIT_OWN_CLIENT: "EDIT_OWN_CLIENT",
    EDIT_ALL_CLIENTS: "EDIT_ALL_CLIENTS",
    MANAGE_ADDONS: "MANAGE_ADDONS",
    MANAGE_CITIES: "MANAGE_CITIES",
    MANAGE_AGREEMENTS: "MANAGE_AGREEMENTS",
    VIEW_ALL_CLIENTS: "VIEW_ALL_CLIENTS",
    SUGGEST_EDITS: "SUGGEST_EDITS",
    VIEW_ANALYTICS_GENERAL: "VIEW_ANALYTICS_GENERAL",
    VIEW_ANALYTICS_OWN: "VIEW_ANALYTICS_OWN",
    DELETE_OWN_CLIENT: "DELETE_OWN_CLIENT",
    DELETE_ALL_CLIENTS: "DELETE_ALL_CLIENTS",
    HIDE_OWN_CLIENT: "HIDE_OWN_CLIENT",
    HIDE_ALL_CLIENTS: "HIDE_ALL_CLIENTS",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PRESETS = {
    ADMIN: {
        name: "Администратор",
        permissions: ["ADMIN", "VIEW_ANALYTICS_GENERAL", "VIEW_ANALYTICS_OWN"],
        description: "Полный доступ ко всем функциям",
    },
    MANAGER: {
        name: "Менеджер",
        permissions: ["CREATE_CLIENT", "EDIT_OWN_CLIENT", "VIEW_ALL_CLIENTS", "SUGGEST_EDITS", "VIEW_ANALYTICS_OWN"],
        description: "Создание и редактирование своих клиентов",
    },
    SENIOR_MANAGER: {
        name: "Старший менеджер",
        permissions: ["CREATE_CLIENT", "EDIT_OWN_CLIENT", "EDIT_ALL_CLIENTS", "VIEW_ALL_CLIENTS", "SUGGEST_EDITS", "VIEW_ANALYTICS_OWN", "HIDE_OWN_CLIENT", "HIDE_ALL_CLIENTS", "DELETE_OWN_CLIENT", "DELETE_ALL_CLIENTS"],
        description: "Редактирование всех клиентов + удаление и скрытие",
    },
    CONTENT_MANAGER: {
        name: "Контент-менеджер",
        permissions: ["MANAGE_ADDONS", "MANAGE_CITIES", "MANAGE_AGREEMENTS", "VIEW_ALL_CLIENTS"],
        description: "Управление справочниками (дополнения, города, договоры)",
    },
} as const;

export type RolePreset = keyof typeof ROLE_PRESETS;

export function hasPermission(
    userPermissions: string[],
    required: Permission | Permission[]
): boolean {
    if (userPermissions.includes(PERMISSIONS.ADMIN)) return true;

    if (Array.isArray(required)) {
        return required.some((p) => userPermissions.includes(p));
    }
    return userPermissions.includes(required as string);
}

export const STATUS_COLORS = {
    ACTIVE: "",
    CLOSED: "border-red-500 bg-red-50 dark:bg-red-950",
    NO_CONTRACT: "border-pink-500 bg-pink-50 dark:bg-pink-950",
    LEFT: "border-red-500 bg-red-50 dark:bg-red-950",
    SEASONAL: "border-gray-400 bg-gray-50 dark:bg-gray-800",
    LAUNCHING: "border-lime-500 bg-lime-50 dark:bg-lime-950",
    DEBT: "border-orange-500 bg-orange-50 dark:bg-orange-950",
} as const;

export const STATUS_LABELS = {
    ACTIVE: "На договоре",
    CLOSED: "Закрыт",
    NO_CONTRACT: "Нет договора",
    LEFT: "Ушёл от нас",
    SEASONAL: "Сезонный",
    LAUNCHING: "На запуске",
    DEBT: "Есть долги",
} as const;

export const PERMISSION_LABELS: Record<string, string> = {
    ADMIN: "Администратор",
    CREATE_USER: "Создание пользователей",
    CREATE_CLIENT: "Создание клиентов",
    EDIT_OWN_CLIENT: "Редактирование своих клиентов",
    EDIT_ALL_CLIENTS: "Редактирование всех клиентов",
    MANAGE_ADDONS: "Управление дополнениями",
    MANAGE_CITIES: "Управление городами",
    MANAGE_AGREEMENTS: "Управление договорами",
    VIEW_ALL_CLIENTS: "Просмотр всех клиентов",
    SUGGEST_EDITS: "Предложение исправлений",
    VIEW_ANALYTICS_GENERAL: "Просмотр общей аналитики",
    VIEW_ANALYTICS_OWN: "Просмотр своей аналитики",
    DELETE_OWN_CLIENT: "Удаление своих клиентов",
    DELETE_ALL_CLIENTS: "Удаление всех клиентов",
    HIDE_OWN_CLIENT: "Скрытие своих клиентов",
    HIDE_ALL_CLIENTS: "Скрытие всех клиентов",
} as const;
