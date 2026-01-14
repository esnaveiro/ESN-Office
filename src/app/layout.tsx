import type {Metadata, Viewport} from "next";
import "./globals.css";
import {Providers} from "@/app/providers";
import {Roboto} from "next/font/google";
import {ErrorBoundary} from "@/components/error-boundary";

const roboto = Roboto({
    variable: "--font-roboto",
    subsets: ["latin"],
    weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
    title: "ESN Office",
    description: "ESN Office presence tracking and availability management",
    manifest: "/manifest.json",
    themeColor: "#00aeef",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "ESN Office",
        startupImage: [
            "/icons/icon-512.png",
        ],
    },
    icons: {
        icon: [
            {url: "/icons/icon-192.png", sizes: "192x192", type: "image/png"},
            {url: "/icons/icon-512.png", sizes: "512x512", type: "image/png"},
        ],
        apple: [
            {url: "/icons/icon-192.png", sizes: "192x192", type: "image/png"},
        ],
        other: [
            {rel: "mask-icon", url: "/icons/icon-maskable-512.png", color: "#2e3192"},
        ],
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: "#00aeef",
};

export default function RootLayout({children,}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <head></head>
        <body className={`${roboto.variable} antialiased min-h-screen flex flex-col`}>
        <ErrorBoundary>
            <Providers>
                {children}
            </Providers>
        </ErrorBoundary>
        </body>
        </html>
    );
}
