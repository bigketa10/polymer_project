"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BarChart2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/teacher/content", label: "Content", icon: BookOpen },
  { href: "/teacher/analytics", label: "Analytics", icon: BarChart2 },
];

export function TeacherNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row lg:flex-col lg:w-64 lg:min-h-screen bg-gray-900 text-white">
      {/* Logo / brand area — visible on sidebar only */}
      <div className="hidden lg:flex items-center px-6 py-5 border-b border-gray-700">
        <span className="font-semibold text-lg tracking-tight">PolymerLingo</span>
      </div>

      {/* Nav links */}
      <ul className="flex flex-row lg:flex-col flex-1 lg:py-4 gap-1 px-2 lg:px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Back to App */}
      <div className="flex lg:flex-col px-2 lg:px-3 lg:pb-4 lg:mt-auto">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to App
        </Link>
      </div>
    </nav>
  );
}
