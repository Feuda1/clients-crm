"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Plus, MoreVertical, Pencil, Trash2, X, Camera, Loader2, Users, Shield, Search } from "lucide-react";
import { PERMISSIONS, PERMISSION_LABELS, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface User {
    id: string;
    login: string;
    name: string;
    avatar: string | null;
    permissions: string[];
    createdAt: Date;
    _count: {
        managedClients: number;
        createdClients: number;
    };
}

interface Role {
    id: string;
    name: string;
    permissions: string[];
    description: string | null;
    color: string | null;
    isDefault: boolean;
}

interface AdminPageClientProps {
    users: User[];
    roles: Role[];
}

type TabType = "users" | "roles";

export function AdminPageClient({ users: initialUsers, roles: initialRoles }: AdminPageClientProps) {
    const router = useRouter();
    const { data: session, update: updateSession } = useSession();
    const [activeTab, setActiveTab] = useState<TabType>("users");
    const [users, setUsers] = useState(initialUsers);
    const [roles, setRoles] = useState(initialRoles);
    const [searchQuery, setSearchQuery] = useState("");


    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u =>
            u.name.toLowerCase().includes(q) ||
            u.login.toLowerCase().includes(q)
        );
    }, [users, searchQuery]);


    const filteredRoles = useMemo(() => {
        if (!searchQuery) return roles;
        const q = searchQuery.toLowerCase();
        return roles.filter(r =>
            r.name.toLowerCase().includes(q) ||
            (r.description && r.description.toLowerCase().includes(q))
        );
    }, [roles, searchQuery]);


    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");

    const [userFormData, setUserFormData] = useState({
        login: "",
        name: "",
        password: "",
        permissions: [] as string[],
    });


    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
    const [roleFormData, setRoleFormData] = useState({
        name: "",
        description: "",
        color: "",
        permissions: [] as string[],
        isDefault: false,
    });


    useEffect(() => {
        setUsers(initialUsers);
        setRoles(initialRoles);
    }, [initialUsers, initialRoles]);


    const openCreateUserModal = () => {
        setEditingUser(null);
        setAvatarFile(null);
        setAvatarPreview(null);
        const defaultRole = roles.find(r => r.isDefault) || roles[0];
        setSelectedRoleId(defaultRole?.id || "custom");
        setUserFormData({
            login: "",
            name: "",
            password: "",
            permissions: defaultRole?.permissions || [],
        });
        setError(null);
        setIsUserModalOpen(true);
    };

    const openEditUserModal = (user: User) => {
        setEditingUser(user);
        setAvatarFile(null);
        setAvatarPreview(user.avatar);
        const matchingRole = roles.find(r =>
            JSON.stringify([...r.permissions].sort()) === JSON.stringify([...user.permissions].sort())
        );
        setSelectedRoleId(matchingRole?.id || "custom");
        setUserFormData({
            login: user.login,
            name: user.name,
            password: "",
            permissions: user.permissions,
        });
        setError(null);
        setIsUserModalOpen(true);
    };

    const closeUserModal = () => {
        setIsUserModalOpen(false);
        setEditingUser(null);
        setError(null);
        setAvatarFile(null);
        setAvatarPreview(null);
    };

    const handleRoleSelect = (roleId: string) => {
        setSelectedRoleId(roleId);
        if (roleId !== "custom") {
            const role = roles.find(r => r.id === roleId);
            if (role) {
                setUserFormData(prev => ({ ...prev, permissions: [...role.permissions] }));
            }
        }
    };

    const toggleUserPermission = (permission: string) => {
        setSelectedRoleId("custom");
        setUserFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter((p) => p !== permission)
                : [...prev.permissions, permission],
        }));
    };

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onload = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let userId: string | null = null;

            if (editingUser) {
                const response = await fetch(`/api/users/${editingUser.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: userFormData.name,
                        permissions: userFormData.permissions,
                        ...(userFormData.password ? { password: userFormData.password } : {}),
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Ошибка при обновлении");
                }
                userId = editingUser.id;


                setUsers(prev => prev.map(u =>
                    u.id === editingUser.id
                        ? { ...u, name: userFormData.name, permissions: userFormData.permissions }
                        : u
                ));
            } else {
                if (!userFormData.password) {
                    throw new Error("Пароль обязателен для нового пользователя");
                }

                const response = await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userFormData),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Ошибка при создании");
                }

                const newUser = await response.json();
                userId = newUser.id;


                setUsers(prev => [{
                    ...newUser,
                    permissions: userFormData.permissions,
                    _count: { managedClients: 0, createdClients: 0 },
                    createdAt: new Date(),
                }, ...prev]);
            }


            if (avatarFile && userId) {
                const avatarFormData = new FormData();
                avatarFormData.append("avatar", avatarFile);
                const avatarResponse = await fetch(`/api/users/${userId}/avatar`, {
                    method: "POST",
                    body: avatarFormData,
                });

                if (avatarResponse.ok) {
                    const avatarResult = await avatarResponse.json();
                    setUsers(prev => prev.map(u =>
                        u.id === userId ? { ...u, avatar: avatarResult.avatar } : u
                    ));
                }
            }


            if (userId === session?.user?.id) {
                await updateSession();
            }

            router.refresh();
            closeUserModal();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Произошла ошибка");
        } finally {
            setIsLoading(false);
        }
    };

    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDeleteUserClick = (user: User) => {
        setUserToDelete(user);
        if (user.id === session?.user?.id) {
            setDeleteError("Вы не можете удалить свой собственный аккаунт.");
        } else {
            setDeleteError(null);
        }
        setIsDeleteUserDialogOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        if (userToDelete.id === session?.user?.id) return;

        try {
            const response = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при удалении");
            }
            setUsers(prev => prev.filter((u) => u.id !== userToDelete.id));
            setIsDeleteUserDialogOpen(false);
            setUserToDelete(null);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Ошибка при удалении");
        }
    };




    const openCreateRoleModal = () => {
        setEditingRole(null);
        setRoleFormData({ name: "", description: "", color: "", permissions: [], isDefault: false });
        setError(null);
        setIsRoleModalOpen(true);
    };

    const openEditRoleModal = (role: Role) => {
        setEditingRole(role);
        setRoleFormData({
            name: role.name,
            description: role.description || "",
            color: role.color || "",
            permissions: [...role.permissions],
            isDefault: role.isDefault,
        });
        setError(null);
        setIsRoleModalOpen(true);
    };

    const closeRoleModal = () => {
        setIsRoleModalOpen(false);
        setEditingRole(null);
        setError(null);
    };

    const toggleRolePermission = (permission: string) => {
        setRoleFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter((p) => p !== permission)
                : [...prev.permissions, permission],
        }));
    };

    const handleRoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles";
            const method = editingRole ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(roleFormData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Ошибка при сохранении");
            }

            if (editingRole) {
                setRoles(prev => {
                    if (data.isDefault) {
                        return prev.map(r => r.id === editingRole.id ? data : { ...r, isDefault: false });
                    }
                    return prev.map(r => r.id === editingRole.id ? data : r);
                });
            } else {
                setRoles(prev => {
                    if (data.isDefault) {
                        return [...prev.map(r => ({ ...r, isDefault: false })), data];
                    }
                    return [...prev, data];
                });
            }

            closeRoleModal();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Произошла ошибка");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRoleClick = (role: Role) => {
        setRoleToDelete(role);
        setDeleteError(null);
        setIsDeleteRoleDialogOpen(true);
    };

    const confirmDeleteRole = async () => {
        if (!roleToDelete) return;

        try {
            const response = await fetch(`/api/roles/${roleToDelete.id}`, { method: "DELETE" });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Ошибка при удалении");
            }
            setRoles(prev => prev.filter((r) => r.id !== roleToDelete.id));
            setIsDeleteRoleDialogOpen(false);
            setRoleToDelete(null);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Ошибка при удалении");
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Администрирование</h1>
                    <p className="text-muted-foreground mt-1">
                        Управление пользователями и ролями
                    </p>
                </div>
                {activeTab === "users" ? (
                    <Button onClick={openCreateUserModal}>
                        <Plus className="h-4 w-4 mr-2" />
                        Новый пользователь
                    </Button>
                ) : (
                    <Button onClick={openCreateRoleModal}>
                        <Plus className="h-4 w-4 mr-2" />
                        Новая роль
                    </Button>
                )}
            </div>


            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === "users" ? "default" : "outline"}
                        onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
                        className="gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Пользователи ({users.length})
                    </Button>
                    <Button
                        variant={activeTab === "roles" ? "default" : "outline"}
                        onClick={() => { setActiveTab("roles"); setSearchQuery(""); }}
                        className="gap-2"
                    >
                        <Shield className="h-4 w-4" />
                        Роли ({roles.length})
                    </Button>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={activeTab === "users" ? "Поиск по имени, логину..." : "Поиск по названию..."}
                        className="pl-9"
                    />
                </div>
            </div>


            {activeTab === "users" && (
                <>
                    <div className="bg-card rounded-lg border border-border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-4 text-muted-foreground font-medium">Пользователь</th>
                                    <th className="text-left p-4 text-muted-foreground font-medium">Логин</th>
                                    <th className="text-left p-4 text-muted-foreground font-medium">Роль</th>
                                    <th className="text-left p-4 text-muted-foreground font-medium">Клиенты</th>
                                    <th className="text-right p-4 text-muted-foreground font-medium">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => {
                                    const matchingRole = roles.find(r =>
                                        JSON.stringify([...r.permissions].sort()) === JSON.stringify([...user.permissions].sort())
                                    );
                                    return (
                                        <tr key={user.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={user.avatar || undefined} />
                                                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                                                            {user.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-foreground font-medium">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-muted-foreground">{user.login}</td>
                                            <td className="p-4">
                                                {matchingRole ? (
                                                    <Badge
                                                        style={matchingRole.color ? {
                                                            backgroundColor: `${matchingRole.color}15`,
                                                            color: matchingRole.color,
                                                            borderColor: `${matchingRole.color}40`,
                                                        } : undefined}
                                                        className={matchingRole.color ? "" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}
                                                    >
                                                        {matchingRole.name}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">Свои права</Badge>
                                                )}
                                            </td>
                                            <td className="p-4 text-muted-foreground">{user._count.managedClients} закреплённых</td>
                                            <td className="p-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEditUserModal(user)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Редактировать
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteUserClick(user);
                                                            }}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Удалить
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}


            {activeTab === "roles" && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredRoles.map((role) => (
                            <div key={role.id} className={`bg-card rounded-lg border p-4 relative transition-all ${role.isDefault ? "border-blue-500/50 shadow-md bg-blue-500/5" : "border-border"}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-start gap-3">
                                        {role.color && (
                                            <div
                                                className="w-4 h-4 rounded-full shrink-0 mt-1"
                                                style={{ backgroundColor: role.color }}
                                            />
                                        )}
                                        <div>
                                            <h3 className="font-semibold flex items-center gap-2" style={role.color ? { color: role.color } : undefined}>
                                                {role.name}
                                            </h3>
                                            {role.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditRoleModal(role)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Редактировать
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onSelect={(e) => {
                                                    e.preventDefault();
                                                    handleDeleteRoleClick(role);
                                                }}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Удалить
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {role.permissions.slice(0, 5).map((p) => (
                                        <Badge key={p} variant="outline" className="text-xs">
                                            {PERMISSION_LABELS[p] || p}
                                        </Badge>
                                    ))}
                                    {role.permissions.length > 5 && (
                                        <Badge variant="secondary" className="text-xs">
                                            +{role.permissions.length - 5}
                                        </Badge>
                                    )}
                                </div>
                                {role.isDefault && (
                                    <div className="absolute top-4 right-12">
                                        <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">
                                            Роль по умолчанию
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}


            {
                isUserModalOpen && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-card rounded-lg border border-border w-full max-w-md p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-foreground">
                                    {editingUser ? "Редактировать пользователя" : "Новый пользователь"}
                                </h2>
                                <Button variant="ghost" size="sm" onClick={closeUserModal} className="h-6 w-6 p-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleUserSubmit} className="space-y-4">

                                <div className="flex justify-center">
                                    <div className="relative group">
                                        <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                                        <button type="button" onClick={() => avatarInputRef.current?.click()} className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
                                            <Avatar className="w-20 h-20 transition-opacity group-hover:opacity-80">
                                                {avatarPreview && <AvatarImage src={avatarPreview} />}
                                                <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                                                    {userFormData.name?.charAt(0)?.toUpperCase() || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="h-6 w-6 text-white" />
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {!editingUser && (
                                    <div>
                                        <label className="text-sm font-medium text-foreground block mb-1">Логин *</label>
                                        <Input value={userFormData.login} onChange={(e) => setUserFormData({ ...userFormData, login: e.target.value })} placeholder="username" required className="bg-background" />
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Имя *</label>
                                    <Input value={userFormData.name} onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })} placeholder="Иван Иванов" required className="bg-background" />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">
                                        {editingUser ? "Новый пароль (оставьте пустым)" : "Пароль *"}
                                    </label>
                                    <Input type="password" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} placeholder="••••••••" required={!editingUser} className="bg-background" />
                                </div>


                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Роль</label>
                                    <Select value={selectedRoleId} onValueChange={handleRoleSelect}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Выберите роль" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.id}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="custom">Свои права</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-2">Права доступа</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-input rounded-md p-2 bg-background">
                                        {Object.entries(PERMISSIONS).map(([key, value]) => (
                                            <div key={key} className="flex items-center gap-2">
                                                <Checkbox id={`user-${key}`} checked={userFormData.permissions.includes(value)} onCheckedChange={() => toggleUserPermission(value)} />
                                                <label htmlFor={`user-${key}`} className="text-sm text-foreground cursor-pointer">{PERMISSION_LABELS[value] || value}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="outline" onClick={closeUserModal}>Отмена</Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</> : editingUser ? "Сохранить" : "Создать"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }


            {
                isRoleModalOpen && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-card rounded-lg border border-border w-full max-w-md p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-foreground">
                                    {editingRole ? "Редактировать роль" : "Новая роль"}
                                </h2>
                                <Button variant="ghost" size="sm" onClick={closeRoleModal} className="h-6 w-6 p-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleRoleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Название *</label>
                                    <Input value={roleFormData.name} onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })} placeholder="Менеджер" required className="bg-background" />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Описание</label>
                                    <Input value={roleFormData.description} onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })} placeholder="Краткое описание роли" className="bg-background" />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1">Цвет</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={roleFormData.color || "#3b82f6"}
                                            onChange={(e) => setRoleFormData({ ...roleFormData, color: e.target.value })}
                                            className="w-10 h-10 rounded-md border border-input cursor-pointer"
                                        />
                                        <Input
                                            value={roleFormData.color}
                                            onChange={(e) => setRoleFormData({ ...roleFormData, color: e.target.value })}
                                            placeholder="#3b82f6"
                                            className="bg-background flex-1"
                                        />
                                        {roleFormData.color && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setRoleFormData({ ...roleFormData, color: "" })}
                                                className="h-8 px-2"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="isDefault" checked={roleFormData.isDefault} onCheckedChange={(checked) => setRoleFormData({ ...roleFormData, isDefault: !!checked })} />
                                    <label htmlFor="isDefault" className="text-sm text-foreground cursor-pointer">Роль по умолчанию для новых пользователей</label>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-2">Права доступа</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-input rounded-md p-2 bg-background">
                                        {Object.entries(PERMISSIONS).map(([key, value]) => (
                                            <div key={key} className="flex items-center gap-2">
                                                <Checkbox id={`role-${key}`} checked={roleFormData.permissions.includes(value)} onCheckedChange={() => toggleRolePermission(value)} />
                                                <label htmlFor={`role-${key}`} className="text-sm text-foreground cursor-pointer">{PERMISSION_LABELS[value] || value}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="outline" onClick={closeRoleModal}>Отмена</Button>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</> : editingRole ? "Сохранить" : "Создать"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить пользователя?</DialogTitle>
                        <DialogDescription>
                            Вы действительно хотите удалить пользователя "{userToDelete?.name}"?
                            Это действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                            {deleteError}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDeleteUser}
                            disabled={userToDelete?.id === session?.user?.id}
                        >
                            Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <Dialog open={isDeleteRoleDialogOpen} onOpenChange={setIsDeleteRoleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить роль?</DialogTitle>
                        <DialogDescription>
                            Вы действительно хотите удалить роль "{roleToDelete?.name}"?
                            Это действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError && !userToDelete && (
                        <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
                            {deleteError}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteRoleDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteRole}>
                            Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
