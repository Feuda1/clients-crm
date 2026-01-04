import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

export default NextAuth(authConfig).auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    const isAuthPage = nextUrl.pathname === "/login";
    const isApiRoute = nextUrl.pathname.startsWith("/api");
    const isPublicRoute = nextUrl.pathname === "/";

    if (isApiRoute) {
        return NextResponse.next();
    }

    if (isAuthPage && isLoggedIn) {
        return NextResponse.redirect(new URL("/clients", nextUrl));
    }

    if (!isLoggedIn && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    if (isPublicRoute && isLoggedIn) {
        return NextResponse.redirect(new URL("/clients", nextUrl));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|api).*)"],
};
