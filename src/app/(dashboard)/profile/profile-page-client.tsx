"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Save, User, Camera, Loader2 } from "lucide-react";
import { PERMISSION_LABELS } from "@/lib/utils";

interface ProfilePageClientProps {
    user: {
        id: string;
        name: string;
        login: string;
        avatar: string | null;
        permissions: string[];
    };
}

export function ProfilePageClient({ user }: ProfilePageClientProps) {
    const router = useRouter();
    const { update: updateSession } = useSession();
    const { theme, setTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [currentAvatar, setCurrentAvatar] = useState(user.avatar);
    const avatarInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        setCurrentAvatar(user.avatar);
    }, [user.avatar]);

    const [formData, setFormData] = useState({
        name: user.name,
        password: "",
        confirmPassword: "",
    });

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        setError(null);

        try {
            const formDataUpload = new FormData();
            formDataUpload.append("avatar", file);

            const response = await fetch(`/api/users/${user.id}/avatar`, {
                method: "POST",
                body: formDataUpload,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при загрузке аватара");
            }

            const result = await response.json();
            console.log("[PROFILE] Avatar uploaded, result:", result);
            setCurrentAvatar(result.avatar);


            console.log("[PROFILE] Updating session...");
            await updateSession({ avatar: result.avatar });
            console.log("[PROFILE] Session updated");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка загрузки");
        } finally {
            setIsUploadingAvatar(false);
            if (avatarInputRef.current) {
                avatarInputRef.current.value = "";
            }
        }
    };

    const handleSave = async () => {
        if (formData.password && formData.password !== formData.confirmPassword) {
            setError("Пароли не совпадают");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    ...(formData.password ? { password: formData.password } : {}),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при сохранении");
            }

            setSuccess(true);
            setFormData({ ...formData, password: "", confirmPassword: "" });
            setTimeout(() => setSuccess(false), 3000);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Произошла ошибка");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <User className="h-6 w-6 text-muted-foreground" />
                Профиль
            </h1>

            {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                    Изменения сохранены
                </div>
            )}

            <div className="space-y-6">

                <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center gap-4 mb-6">

                        <div className="relative group">
                            <input
                                type="file"
                                ref={avatarInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                                <Avatar className="w-20 h-20 transition-opacity group-hover:opacity-80">
                                    {currentAvatar && <AvatarImage src={currentAvatar} />}
                                    <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                                        {user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isUploadingAvatar ? (
                                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    ) : (
                                        <Camera className="h-6 w-6 text-white" />
                                    )}
                                </div>
                            </button>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
                            <p className="text-muted-foreground">{user.login}</p>
                            <p className="text-xs text-muted-foreground mt-1">Нажмите на аватар для загрузки</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-foreground block mb-1">
                                Имя
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="Ваше имя"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground block mb-1">
                                Новый пароль
                            </label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                placeholder="Оставьте пустым, чтобы не менять"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground block mb-1">
                                Подтвердите пароль
                            </label>
                            <Input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                    setFormData({ ...formData, confirmPassword: e.target.value })
                                }
                                placeholder="Повторите новый пароль"
                            />
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="w-full"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isLoading ? "Сохранение..." : "Сохранить изменения"}
                        </Button>
                    </div>
                </div>


                <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        Тема оформления
                    </h3>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setTheme("dark")}
                            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${theme === "dark"
                                ? "border-primary bg-accent"
                                : "border-border bg-card hover:bg-accent"
                                }`}
                        >
                            <Moon className="h-5 w-5 text-foreground" />
                            <span className="text-foreground font-medium">Тёмная</span>
                        </button>

                        <button
                            onClick={() => setTheme("light")}
                            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${theme === "light"
                                ? "border-primary bg-accent"
                                : "border-border bg-card hover:bg-accent"
                                }`}
                        >
                            <Sun className="h-5 w-5 text-yellow-500" />
                            <span className="text-foreground font-medium">Светлая</span>
                        </button>
                    </div>
                </div>


                <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        Права доступа
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {user.permissions.map((perm) => (
                            <span
                                key={perm}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border"
                            >
                                {PERMISSION_LABELS[perm] || perm}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
