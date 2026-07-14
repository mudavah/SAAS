"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
  import {
    LayoutDashboard,
    FileText,
    Users,
    CreditCard,
    Receipt,
    CheckSquare,
    Sparkles,
    Settings,
    Menu,
    X,
    LogOut,
    BarChart3,
    Package,
    Boxes,
    ShoppingCart,
    BookOpen,
    Shield,
    Users2,
    Bell,
    FileSearch,
    Wallet,
    Link2,
    Activity,
    Store,
    Building2,
  } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/timeline", label: "Timeline", icon: Activity },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/payments/links", label: "Payment Links", icon: Link2 },
  { href: "/dashboard/payments/subscriptions", label: "Subscriptions", icon: Wallet },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/ai", label: "AI Assistant", icon: Sparkles },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/inventory/products", label: "Products", icon: Boxes },
  { href: "/dashboard/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/dashboard/pos", label: "POS", icon: Store },
  { href: "/dashboard/bookkeeping", label: "Bookkeeping", icon: BookOpen },
  { href: "/dashboard/compliance", label: "eTIMS", icon: Shield },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/team", label: "Team", icon: Users2 },
  { href: "/dashboard/hr", label: "HR", icon: Users },
  { href: "/dashboard/hr/employees", label: "Employees", icon: Users },
  { href: "/dashboard/hr/departments", label: "Departments", icon: Building2 },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/audit", label: "Audit Logs", icon: FileSearch },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  const navLinkClass = (href: string) =>
    cn(
      "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:scale-95 touch-manipulation",
      isActive(href)
        ? "bg-kazi-green/10 text-kazi-green"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-transform active:scale-90 touch-manipulation"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-kazi-green text-white font-bold text-xs">
            KF
          </div>
          <span className="font-bold text-kazi-green">KaziFlow</span>
        </Link>
      </header>

      {/* Desktop sidebar (hidden on mobile; mobile uses the bottom sheet) */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background lg:flex">
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center px-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kazi-green text-white font-bold text-sm">
                KF
              </div>
              <span className="font-bold text-kazi-green">KaziFlow</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t p-3">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ""} />
                <AvatarFallback className="bg-kazi-green/10 text-kazi-green text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name}
                </p>
                <Badge variant="secondary" className="text-xs capitalize">
                  {session?.user?.plan || "free"}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start mt-1 min-h-[44px] text-muted-foreground"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile navigation: bottom sheet */}
      <BottomSheet
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="Navigation"
      >
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors active:scale-95 touch-manipulation",
                isActive(item.href)
                  ? "bg-kazi-green/10 text-kazi-green"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-3 border-t pt-3">
          <div className="flex items-center gap-3 px-1 py-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="bg-kazi-green/10 text-kazi-green text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session?.user?.name}
              </p>
              <Badge variant="secondary" className="text-xs capitalize">
                {session?.user?.plan || "free"}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start min-h-[48px] text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </BottomSheet>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6 lg:p-8 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
