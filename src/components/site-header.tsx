"use client"

import React, { Suspense, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ThemeToggleMini } from "@/components/theme-toggle-mini"
import { EsnRectangles } from "@/components/esn-rectangles"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { ClipboardCheck, Home, LayoutDashboard, LogOut, Menu, Package, Shield, User } from "lucide-react"
import { signOut } from "@/lib/auth-client"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  active: (pathname: string, searchParams: URLSearchParams) => boolean
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/",          label: "Home",      icon: Home,            active: p => p === "/" },
  { href: "/check-ins", label: "Check-ins", icon: ClipboardCheck,  active: p => p === "/check-ins" },
  { href: "/inventory", label: "Inventory", icon: Package,         active: p => p === "/inventory" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: p => p === "/dashboard" },
  { href: "/profile",   label: "Profile",   icon: User,            active: (p, s) => p === "/profile" && !s.get("userId") },
  { href: "/admin",     label: "Admin",     icon: Shield,          active: p => p.startsWith("/admin"), adminOnly: true },
]

function SiteHeaderInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isAdmin, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      setMobileMenuOpen(false)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <EsnRectangles />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold flex gap-2 items-center">
            <Image src="/ESNLogo.png" alt="ESN Logo" width={24} height={24} className="h-6 w-6" />
            ESN Office
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {!loading && user && (
              <nav className="flex items-center gap-2">
                {visibleItems.map(({ href, label, icon: Icon, active }) => (
                  <Link key={href} href={href}>
                    <Button variant={active(pathname, searchParams) ? "default" : "ghost"} className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {label}
                    </Button>
                  </Link>
                ))}
              </nav>
            )}

            <div className="flex gap-2">
              <ThemeToggle />
              <ThemeToggleMini />
            </div>

            {!loading && (
              user ? (
                <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
                  <LogOut className="size-4" />
                  Sign Out
                </Button>
              ) : (
                <Link href="/auth/login">
                  <Button className="bg-primary hover:bg-primary/90">Sign In</Button>
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2 px-4">
            <div className="flex gap-2">
              <ThemeToggle />
              <ThemeToggleMini />
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <SheetHeader className="text-left">
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>Navigate through ESN Office</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col gap-4 mt-6 px-4">
                  {!loading && user && (
                    <>
                      {visibleItems.map(({ href, label, icon: Icon, active }) => (
                        <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}>
                          <Button variant={active(pathname, searchParams) ? "default" : "ghost"} className="w-full justify-start gap-2">
                            <Icon className="size-4" />
                            {label}
                          </Button>
                        </Link>
                      ))}
                      <div className="border-t pt-4">
                        <Button variant="outline" onClick={handleSignOut} className="w-full justify-start gap-2">
                          <LogOut className="size-4" />
                          Sign Out
                        </Button>
                      </div>
                    </>
                  )}

                  {!loading && !user && (
                    <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-primary/90">Sign In</Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}

export function SiteHeader() {
  return (
    <Suspense fallback={
      <header className="border-b border-border bg-background sticky top-0 z-50 h-[57px]" />
    }>
      <SiteHeaderInner />
    </Suspense>
  )
}
