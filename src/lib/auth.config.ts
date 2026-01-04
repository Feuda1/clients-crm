import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.login = user.login;
                token.avatar = user.avatar;
                token.permissions = user.permissions;
                token.avatarUpdatedAt = Date.now();
            }

            const AVATAR_REFRESH_INTERVAL = 5 * 60 * 1000;
            const lastUpdate = (token.avatarUpdatedAt as number) || 0;

            if (trigger === "update") {
                if (session?.avatar) {
                    console.log(`[AUTH] Обновление сессии с предоставленным аватаром: ${session.avatar}`);
                    token.avatar = session.avatar;
                    token.avatarUpdatedAt = Date.now();
                }
            }

            if (trigger === "update" || Date.now() - lastUpdate > AVATAR_REFRESH_INTERVAL) {
                console.log(`[AUTH] Обновление данных сессии для пользователя ${token.id}, триггер: ${trigger}`);
                try {
                    const { prisma } = await import("./prisma");
                    const freshUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { avatar: true, name: true },
                    });
                    console.log(`[AUTH] Свежие данные пользователя:`, freshUser);
                    if (freshUser) {
                        token.avatar = freshUser.avatar;
                        token.name = freshUser.name;
                        token.avatarUpdatedAt = Date.now();
                        console.log(`[AUTH] Токен обновлен с аватаром: ${token.avatar}`);
                    }
                } catch (e) {
                    console.error("[AUTH] Ошибка обновления данных пользователя:", e);
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.login = token.login as string;
                session.user.avatar = token.avatar as string | null;
                session.user.permissions = token.permissions as string[];
            }
            return session;
        },
    },
    providers: [],
    trustHost: true,
} satisfies NextAuthConfig;
