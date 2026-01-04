"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
    Users,
    UserCircle,
    Settings,
    LogOut,
    User,
    ChevronLeft,
    ChevronRight,
    Menu,
    Tag,
    MessageSquare,
    BarChart,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, hasPermission } from "@/lib/utils";

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
}

interface SidebarProps {
    defaultCollapsed?: boolean;
}

export function Sidebar({ defaultCollapsed = true }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [mounted, setMounted] = useState(false);
    const [suggestionsCount, setSuggestionsCount] = useState(0);
    const prevSuggestionsCount = useRef(0);
    const isFirstLoad = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio("/sounds/notification.mp3");
        audioRef.current.volume = 0.3;
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved !== null) {
            setIsCollapsed(saved === "true");
        }
        setMounted(true);
    }, []);

    const [managedClientsCount, setManagedClientsCount] = useState(0);

    useEffect(() => {
        const fetchSuggestionsCount = async () => {
            try {
                const response = await fetch("/api/suggestions/count");
                if (response.ok) {
                    const data = await response.json();
                    const newCount = data.count || 0;

                    if (!isFirstLoad.current && newCount > prevSuggestionsCount.current) {
                        try {
                            await audioRef.current?.play();
                        } catch (e) {
                            if ((e as Error).name !== "NotAllowedError") {
                                console.error("Audio playback error:", e);
                            }
                        }
                    }

                    isFirstLoad.current = false;
                    prevSuggestionsCount.current = newCount;
                    setSuggestionsCount(newCount);
                    setManagedClientsCount(data.managedClientsCount || 0);
                }
            } catch (error) {
                console.error("Error fetching suggestions count:", error);
            }
        };

        if (session?.user) {
            fetchSuggestionsCount();

            const interval = setInterval(fetchSuggestionsCount, 10000);


            const handleUpdate = () => fetchSuggestionsCount();
            window.addEventListener("suggestions-updated", handleUpdate);

            const handleFocus = () => fetchSuggestionsCount();
            window.addEventListener("focus", handleFocus);

            return () => {
                clearInterval(interval);
                window.removeEventListener("suggestions-updated", handleUpdate);
                window.removeEventListener("focus", handleFocus);
            };
        }
    }, [session?.user, pathname]);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar-collapsed", String(newState));
        window.dispatchEvent(new CustomEvent("sidebar-toggle"));
    };

    const showAdmin =
        session?.user?.permissions &&
        hasPermission(session.user.permissions, "ADMIN");

    const canViewDictionaries =
        hasPermission(session?.user?.permissions || [], "ADMIN") ||
        hasPermission(session?.user?.permissions || [], "MANAGE_ADDONS") ||
        hasPermission(session?.user?.permissions || [], "MANAGE_CITIES") ||
        hasPermission(session?.user?.permissions || [], "MANAGE_AGREEMENTS") ||
        hasPermission(session?.user?.permissions || [], "VIEW_ALL_CLIENTS");

    const canViewDictionariesStrict =
        hasPermission(session?.user?.permissions || [], "ADMIN") ||
        hasPermission(session?.user?.permissions || [], "MANAGE_ADDONS") ||
        hasPermission(session?.user?.permissions || [], "MANAGE_CITIES") ||
        hasPermission(session?.user?.permissions || [], "MANAGE_AGREEMENTS");

    const canViewAnalytics =
        hasPermission(session?.user?.permissions || [], "ADMIN") ||
        hasPermission(session?.user?.permissions || [], "VIEW_ANALYTICS_GENERAL") ||
        hasPermission(session?.user?.permissions || [], "VIEW_ANALYTICS_OWN");

    const navigation: NavItem[] = [
        { name: "Все клиенты", href: "/clients", icon: Users },
        ...(managedClientsCount > 0 ? [{ name: "Мои клиенты", href: "/my-clients", icon: UserCircle, badge: suggestionsCount > 0 ? suggestionsCount : undefined }] : []),
        ...(canViewDictionariesStrict ? [{ name: "Справочники", href: "/addons", icon: Tag }] : []),
        ...(canViewAnalytics ? [{ name: "Дашборд", href: "/dashboard", icon: BarChart }] : []),
    ];

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 h-full flex flex-col z-40 w-16",
                mounted && "bg-card border-r border-border transition-all duration-300",
                mounted && (isCollapsed ? "w-16" : "w-60"),
                !mounted && "invisible"
            )}
        >
            <div className="h-14 flex items-center justify-between px-3 border-b border-border">
                {!isCollapsed && (
                    <span className="text-sm font-medium text-muted-foreground">Меню</span>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCollapse}
                    className={cn(
                        "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent",
                        isCollapsed && "mx-auto"
                    )}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </Button>
            </div>

            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                                isActive
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? item.name : undefined}
                        >
                            <div className="relative">
                                <item.icon size={20} />
                                {isCollapsed && item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                                        {item.badge > 9 ? "9+" : item.badge}
                                    </span>
                                )}
                            </div>
                            {!isCollapsed && (
                                <span className="flex-1">{item.name}</span>
                            )}
                            {!isCollapsed && item.badge && item.badge > 0 && (
                                <span className="min-w-[22px] h-[22px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1.5">
                                    {item.badge > 99 ? "99+" : item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {showAdmin && <div className="my-2 border-t border-border" />}

                {showAdmin && (
                    <Link
                        href="/admin"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            pathname.startsWith("/admin")
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                            isCollapsed && "justify-center px-2"
                        )}
                        title={isCollapsed ? "Администрирование" : undefined}
                    >
                        <Settings size={20} />
                        {!isCollapsed && <span>Администрирование</span>}
                    </Link>
                )}
            </nav>

            <div className="p-2 border-t border-border">
                <DropdownMenu>
                    <DropdownMenuTrigger
                        className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <Avatar className="h-8 w-8">
                            {session?.user?.avatar && (
                                <AvatarImage src={session.user.avatar} />
                            )}
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                        {!isCollapsed && (
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {session?.user?.name}
                                </p>
                            </div>
                        )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile">
                                <User className="mr-2 h-4 w-4" />
                                Профиль
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="text-white bg-destructive hover:bg-destructive/90 focus:bg-destructive/90 focus:text-white"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Выход
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}

export function useSidebarWidth() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved !== null) {
            setIsCollapsed(saved === "true");
        }

        const handleStorage = () => {
            const saved = localStorage.getItem("sidebar-collapsed");
            setIsCollapsed(saved === "true");
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    return isCollapsed ? 64 : 240;
}
