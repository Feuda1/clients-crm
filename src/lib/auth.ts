import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                login: { label: "Логин", type: "text" },
                password: { label: "Пароль", type: "password" },
                rememberMe: { label: "Запомнить меня", type: "checkbox" },
            },
            async authorize(credentials) {
                if (!credentials?.login || !credentials?.password) {
                    return null;
                }

                const bcrypt = await import("bcryptjs");
                const { prisma } = await import("./prisma");

                const user = await prisma.user.findUnique({
                    where: { login: credentials.login as string },
                });

                if (!user) {
                    return null;
                }

                const passwordMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!passwordMatch) {
                    return null;
                }

                return {
                    id: user.id,
                    name: user.name,
                    login: user.login,
                    avatar: user.avatar,
                    permissions: JSON.parse(user.permissions),
                };
            },
        }),
    ],
});
