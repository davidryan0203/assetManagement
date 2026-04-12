"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@frontend/context/AuthContext";
import { FiLogOut, FiBell, FiMenu } from "react-icons/fi";
import toast from "react-hot-toast";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/assets": "Assets",
  "/dashboard/users": "User Management",
  "/dashboard/departments": "Department Management",
  "/dashboard/sites": "Site Management",
};

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const title =
    pageTitles[pathname] ||
    (pathname.includes("/assets") ? "Assets" : pathname.includes("/users") ? "Users" : "Dashboard");

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };

  const roleBadgeClass =
    user?.role === "admin"
      ? "badge-admin"
      : user?.role === "manager"
      ? "badge-manager"
      : "badge-staff";

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <FiMenu className="text-lg" />
        </button>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 leading-tight truncate">{title}</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-none truncate">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors hidden sm:inline-flex">
          <FiBell className="text-lg" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <span className={roleBadgeClass}>{user?.role}</span>
          </div>
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <FiLogOut className="text-lg" />
          </button>
        </div>
      </div>
    </header>
  );
}
