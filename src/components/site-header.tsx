"use client"

import React, {useState, useEffect} from "react";
import {usePathname, useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {ThemeToggle} from "@/components/theme-toggle";
import {ThemeToggleMini} from "@/components/theme-toggle-mini";
import {EsnRectangles} from "@/components/esn-rectangles";
import Link from "next/link";
import {useAuth} from "@/hooks/useAuth";
import {ClipboardCheck, Home, LayoutDashboard, LogOut, Menu, Package, User, CheckSquare} from "lucide-react";
import {signOut} from "@/lib/auth-client";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,} from "@/components/ui/sheet";

export function SiteHeader() {

    const router = useRouter();
    const pathname = usePathname();
    const {user, loading} = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isBoardMember, setIsBoardMember] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            setMobileMenuOpen(false);
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Check if user is a board member
    useEffect(() => {
        const checkBoardMembership = async () => {
            if (!user?.email) {
                setIsBoardMember(false);
                return;
            }

            try {
                const response = await fetch('/api/admin/board-settings');
                if (response.ok) {
                    const data = await response.json();
                    const boardEmails = data.board_emails || [];
                    setIsBoardMember(boardEmails.includes(user.email));
                }
            } catch (error) {
                console.error('Error checking board membership:', error);
                setIsBoardMember(false);
            }
        };

        checkBoardMembership();
    }, [user]);

    const isHomePage = pathname === '/';
    const isCheckInsPage = pathname === '/check-ins';
    const isDashboardPage = pathname === '/dashboard';
    const isProfilePage = pathname === '/profile';
    const isInventoryPage = pathname === '/inventory';
    const isRequestsPage = pathname === '/requests';

    return (
        <header className="border-b border-border bg-background sticky top-0 z-50">
            <EsnRectangles/>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3">
                    {/* Logo */}
                    <Link href="/" className="text-xl font-bold flex gap-2 items-center">
                        {/*<Image src="/ESNLogo.png" alt="ESN Aveiro Logo" width={24} height={24} className="h-6 w-6"/>*/}
                        <img src="/ESNLogo.png" alt="ESN Aveiro Logo" className="h-6 w-6"/>
                        <span className="hidden sm:inline">ESN Office</span>
                        <span className="sm:hidden">ESN Office</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-4">
                        {/* Navigation links when logged in */}
                        {!loading && user && (
                            <nav className="flex items-center gap-2">
                                <Link href="/">
                                    <Button
                                        variant={isHomePage ? "default" : "ghost"}
                                        className="flex items-center gap-2"
                                    >
                                        <Home className="size-4"/>
                                        Home
                                    </Button>
                                </Link>
                                <Link href="/check-ins">
                                    <Button
                                        variant={isCheckInsPage ? "default" : "ghost"}
                                        className="flex items-center gap-2"
                                    >
                                        <ClipboardCheck className="size-4"/>
                                        Check-ins
                                    </Button>
                                </Link>
                                <Link href="/inventory">
                                    <Button
                                        variant={isInventoryPage ? "default" : "ghost"}
                                        className="flex items-center gap-2"
                                    >
                                        <Package className="size-4"/>
                                        Inventory
                                    </Button>
                                </Link>
                                <Link href="/dashboard">
                                    <Button
                                        variant={isDashboardPage ? "default" : "ghost"}
                                        className="flex items-center gap-2"
                                    >
                                        <LayoutDashboard className="size-4"/>
                                        Dashboard
                                    </Button>
                                </Link>
                                {/*{isBoardMember && (*/}
                                {/*    <Link href="/requests">*/}
                                {/*        <Button*/}
                                {/*            variant={isRequestsPage ? "default" : "ghost"}*/}
                                {/*            className="flex items-center gap-2"*/}
                                {/*        >*/}
                                {/*            <CheckSquare className="size-4"/>*/}
                                {/*            Requests*/}
                                {/*        </Button>*/}
                                {/*    </Link>*/}
                                {/*)}*/}
                                <Link href="/profile">
                                    <Button
                                        variant={isProfilePage ? "default" : "ghost"}
                                        className="flex items-center gap-2"
                                    >
                                        <User className="size-4"/>
                                        Profile
                                    </Button>
                                </Link>
                            </nav>
                        )}

                        <div className="flex gap-2">
                            <ThemeToggle/>
                            <ThemeToggleMini/>
                        </div>

                        {!loading && (
                            user ? (
                                <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
                                    <LogOut className="size-4"/>
                                    Sign Out
                                </Button>
                            ) : (
                                <Link href="/auth/login">
                                    <Button className="bg-primary hover:bg-primary/90">
                                        Sign In
                                    </Button>
                                </Link>
                            )
                        )}
                    </div>

                    {/* Mobile Menu */}
                    <div className="flex md:hidden items-center gap-2 px-4">
                        <div className="flex gap-2">
                            <ThemeToggle/>
                            <ThemeToggleMini/>
                        </div>
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5"/>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                                <SheetHeader className="text-left">
                                    <SheetTitle>Menu</SheetTitle>
                                    <SheetDescription>
                                        Navigate through ESN Office
                                    </SheetDescription>
                                </SheetHeader>

                                <div className="flex flex-col gap-4 mt-6 px-4">
                                    {!loading && user && (
                                        <>
                                            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                                                <Button
                                                    variant={isHomePage ? "default" : "ghost"}
                                                    className="w-full justify-start gap-2"
                                                >
                                                    <Home className="size-4"/>
                                                    Home
                                                </Button>
                                            </Link>
                                            <Link href="/check-ins" onClick={() => setMobileMenuOpen(false)}>
                                                <Button
                                                    variant={isCheckInsPage ? "default" : "ghost"}
                                                    className="w-full justify-start gap-2"
                                                >
                                                    <ClipboardCheck className="size-4"/>
                                                    Check-ins
                                                </Button>
                                            </Link>
                                            <Link href="/inventory" onClick={() => setMobileMenuOpen(false)}>
                                                <Button
                                                    variant={isInventoryPage ? "default" : "ghost"}
                                                    className="w-full justify-start gap-2"
                                                >
                                                    <Package className="size-4"/>
                                                    Inventory
                                                </Button>
                                            </Link>
                                            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                                                <Button
                                                    variant={isDashboardPage ? "default" : "ghost"}
                                                    className="w-full justify-start gap-2"
                                                >
                                                    <LayoutDashboard className="size-4"/>
                                                    Dashboard
                                                </Button>
                                            </Link>
                                            {isBoardMember && (
                                                <Link href="/requests" onClick={() => setMobileMenuOpen(false)}>
                                                    <Button
                                                        variant={isRequestsPage ? "default" : "ghost"}
                                                        className="w-full justify-start gap-2"
                                                    >
                                                        <CheckSquare className="size-4"/>
                                                        Requests
                                                    </Button>
                                                </Link>
                                            )}
                                            <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                                                <Button
                                                    variant={isProfilePage ? "default" : "ghost"}
                                                    className="w-full justify-start gap-2"
                                                >
                                                    <User className="size-4"/>
                                                    Profile
                                                </Button>
                                            </Link>
                                            <div className="border-t pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={handleSignOut}
                                                    className="w-full justify-start gap-2"
                                                >
                                                    <LogOut className="size-4"/>
                                                    Sign Out
                                                </Button>
                                            </div>
                                        </>
                                    )}

                                    {!loading && !user && (
                                        <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                                            <Button className="w-full bg-primary hover:bg-primary/90">
                                                Sign In
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
}