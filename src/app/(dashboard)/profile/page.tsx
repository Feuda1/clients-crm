import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfilePageClient } from "./profile-page-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    return (
        <ProfilePageClient
            user={{
                id: session.user.id,
                name: session.user.name,
                login: session.user.login,
                avatar: session.user.avatar,
                permissions: session.user.permissions,
            }}
        />
    );
}
