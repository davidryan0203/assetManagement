"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@frontend/context/AuthContext";
import {
  FiPackage,
  FiGrid,
  FiBox,
  FiUsers,
  FiBriefcase,
  FiChevronRight,
  FiMapPin,
  FiTag,
  FiTruck,
  FiCpu,
  FiBarChart2,
  FiSettings,
  FiX,
} from "react-icons/fi";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  section?: string;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <FiGrid />, section: "main" },
  { label: "Assets", href: "/dashboard/assets", icon: <FiBox />, section: "main" },
  { label: "Consumables", href: "/dashboard/consumables", icon: <FiPackage />, section: "main" },
  { label: "Charts", href: "/dashboard/charts", icon: <FiBarChart2 />, section: "main" },
  { label: "Users", href: "/dashboard/users", icon: <FiUsers />, roles: ["admin"], section: "main" },
  { label: "Departments", href: "/dashboard/departments", icon: <FiBriefcase />, roles: ["admin"], section: "main" },
  { label: "Sites", href: "/dashboard/sites", icon: <FiMapPin />, roles: ["admin"], section: "main" },
  { label: "Reports", href: "/dashboard/reports", icon: <FiBarChart2 />, section: "main" },
  { label: "Settings", href: "/dashboard/settings", icon: <FiSettings />, roles: ["admin"], section: "main" },
  { label: "Categories", href: "/dashboard/categories", icon: <FiTag />, roles: ["admin"], section: "catalog" },
  { label: "Vendors", href: "/dashboard/vendors", icon: <FiTruck />, roles: ["admin"], section: "catalog" },
  { label: "Products", href: "/dashboard/products", icon: <FiCpu />, roles: ["admin"], section: "catalog" },
  { label: "Product Types", href: "/dashboard/product-types", icon: <FiGrid />, roles: ["admin"], section: "catalog" },
];

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [logoError, setLogoError] = useState(false);

  const filtered = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? "")
  );

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col h-full transform transition-transform duration-200 ease-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:inset-auto lg:z-30 lg:w-64 lg:h-auto lg:min-h-screen lg:self-stretch lg:translate-x-0 lg:overflow-hidden
      `}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 lg:hidden">
        <span className="text-sm font-semibold text-gray-700">Navigation</span>
        <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <FiX />
        </button>
      </div>
      {/* Logo */}
      <div className="px-4 sm:px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-gray-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
            {logoError ? (
                <Image
                src="/brand-logo.jpeg"
                alt="Mamu Tshishkutamashutau Innu Education"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
                priority
              />
            ) : (
              <Image
                src="/brand-logo.png"
                alt="Mamu Tshishkutamashutau Innu Education"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
                priority
              />
            )}
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight sm:text-[15px]">Mamu Tshishkutamashutau Innu Education</h1>
            <p className="text-xs text-gray-500 mt-0.5">Asset Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 p-3 sm:p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        {filtered.filter((i) => i.section === "main").map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`text-lg ${isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"}`}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {isActive && <FiChevronRight className="text-primary-500 text-sm" />}
            </Link>
          );
        })}

        {filtered.some((i) => i.section === "catalog") && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3 mt-5">
              Catalog
            </p>
            {filtered.filter((i) => i.section === "catalog").map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className={`text-lg ${isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <FiChevronRight className="text-primary-500 text-sm" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User info at bottom */}
      <div className="shrink-0 border-t border-gray-200 p-3 sm:p-4 bg-white">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
