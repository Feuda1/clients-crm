import "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface User {
        id: string;
        login: string;
        name: string;
        avatar: string | null;
        permissions: string[];
    }

    interface Session {
        user: {
            id: string;
            login: string;
            name: string;
            avatar: string | null;
            permissions: string[];
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        login: string;
        avatar: string | null;
        permissions: string[];
    }
}
