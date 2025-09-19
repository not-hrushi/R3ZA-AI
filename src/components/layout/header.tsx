
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ListChecks, Target, Brain, UserCircle, LogOut, Loader2, Menu, CreditCard, MessageCircle } from "lucide-react"; // Added CreditCard and MessageCircle
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ListChecks },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/insights", label: "Insights", icon: Brain },
  { href: "/r3za-ai", label: "R3ZA AI", icon: MessageCircle },
];

const R3ZALogo = ({
  isSheet = false,
  textClassName,
  iconClassName,
  size = "default"
}: {
  isSheet?: boolean,
  textClassName?: string,
  iconClassName?: string,
  size?: "default" | "small"
}) => {
  const { user, isGuest } = useAuth();
  const svgSize = size === "small" ? (isSheet ? "28" : "24") : (isSheet ? "32" : "28");
  const linkFontSize = size === "small" ? (isSheet ? "xl" : "lg") : (isSheet ? "2xl" : "xl");
  const effectiveHref = (user || isGuest) ? "/dashboard" : "/";

  return (
    <Link href={effectiveHref} className={cn("flex items-center gap-2 font-semibold", `text-${linkFontSize}`)}>
      <svg xmlns="http://www.w3.org/2000/svg" width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(iconClassName ? iconClassName : "text-primary")}>
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
      <span className={cn("font-headline", textClassName ? textClassName : "text-primary")}>R3ZA</span>
    </Link>
  );
};


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isGuest, signOut } = useAuth();

  const handleGuestSignUp = () => {
    signOut().then(() => {
        router.push("/signup");
    });
  };

  return (
    <>
      {/* Desktop Header: Floating Pill */}
      <div className="hidden md:block sticky top-2 z-50 w-full pointer-events-none">
        <div className="container mx-auto max-w-4xl lg:max-w-5xl pointer-events-auto">
          <div className="rounded-full bg-background/70 dark:bg-slate-800/60 backdrop-blur-md shadow-lg border border-border/30 flex h-12 items-center justify-between px-3">
            <div className="flex-shrink-0">
              <R3ZALogo size="small" iconClassName="text-foreground dark:text-slate-200" textClassName="text-foreground dark:text-slate-200" />
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="sm"
                  asChild
                  className={cn(
                    "rounded-full px-3 py-1 text-xs sm:text-sm transition-colors text-foreground/80 dark:text-slate-300 hover:text-foreground dark:hover:text-white",
                    pathname === item.href
                      ? "bg-gradient-to-br from-[hsl(var(--primary-gradient-start))] to-[hsl(var(--primary-gradient-end))] text-primary-foreground shadow-md hover:text-primary-foreground"
                      : "hover:bg-muted/50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("h-3.5 w-3.5 mr-1 sm:mr-1.5 flex-shrink-0", pathname === item.href ? "text-primary-foreground" : "text-foreground/70 dark:text-slate-400 group-hover:text-foreground dark:group-hover:text-slate-200")} />
                    {item.label}
                  </Link>
                </Button>
              ))}
            </nav>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ThemeToggle />
              {loading ? (
                <Button variant="ghost" size="icon" className="rounded-full text-foreground dark:text-slate-200" disabled>
                  <Loader2 className="h-5 w-5 animate-spin" />
                </Button>
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8 border-2 border-transparent hover:border-muted/70 transition-colors">
                        {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || "User"} />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs dark:bg-slate-700 dark:text-slate-300">
                          {isGuest ? 'G' : (user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="h-4 w-4"/>)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName || (isGuest ? "Guest User" : "User")}</p>
                        {!isGuest && user.email && (
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                        {isGuest && (
                          <p className="text-xs leading-none text-muted-foreground">
                            (Local Data Only)
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {!isGuest && (
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <UserCircle className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isGuest && (
                        <DropdownMenuItem onClick={handleGuestSignUp}>
                          <UserCircle className="mr-2 h-4 w-4" />
                          <span>Sign Up to Save Data</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{isGuest ? "Exit Guest Mode" : "Log out"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                 <Button asChild variant="ghost" size="sm" className="rounded-full text-foreground dark:text-slate-200 hover:bg-muted/50 dark:hover:bg-slate-700/50">
                    <Link href="/login">Sign In</Link>
                 </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header: Standard Bar with Hamburger */}
      <header className="md:hidden sticky top-0 z-40 w-full h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto flex h-full items-center justify-between px-4">
          <div className="flex items-center">
            <R3ZALogo />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loading ? (
              <Button variant="ghost" size="icon" className="rounded-full" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
              </Button>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary/50 transition-colors">
                      {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || "User"} />}
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {isGuest ? 'G' : (user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5"/>)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || (isGuest ? "Guest User" : "User")}</p>
                      {!isGuest && user.email && (
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                      {isGuest && (
                        <p className="text-xs leading-none text-muted-foreground">
                          (Local Data Only)
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!isGuest && (
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                   {isGuest && (
                      <DropdownMenuItem onClick={handleGuestSignUp}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Sign Up to Save Data</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isGuest ? "Exit Guest Mode" : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
               pathname !== '/login' && pathname !== '/signup' && (
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href="/login">
                      Sign In
                    </Link>
                  </Button>
                )
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 sm:w-80 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="text-left">
                    <R3ZALogo isSheet={true} />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 p-4">
                  {navItems.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link href={item.href}>
                        <Button
                          variant={pathname === item.href ? "secondary" : "ghost"}
                          className="w-full justify-start rounded-md"
                          size="default"
                        >
                          <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                          {item.label}
                        </Button>
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
