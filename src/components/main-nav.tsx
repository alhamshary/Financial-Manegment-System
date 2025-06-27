
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  FilePlus2,
  FileText,
  Users,
  Cog,
  Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/components/auth-provider";

type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "employee"] },
  { href: "/submit-service", label: "Submit Service", icon: FilePlus2, roles: ["admin", "manager", "employee"] },
  { href: "/services", label: "Services", icon: Wrench, roles: ["admin", "manager"] },
  { href: "/reports", label: "Reports", icon: FileText, roles: ["admin", "manager"] },
  { href: "/team", label: "Team", icon: Users, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Cog, roles: ["admin"] },
];

export function MainNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const accessibleNavItems = navItems.filter(item => item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-2 px-4">
      {accessibleNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === item.href && "bg-sidebar-accent font-bold"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
