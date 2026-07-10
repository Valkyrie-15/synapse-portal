"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavbarProps {
  user: { username: string; name: string; role: string };
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-blue-900 border-b border-blue-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Synapse Healthcare" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Synapse Healthcare</h1>
          <p className="text-blue-300 text-xs leading-tight">Cashless Portal Aggregator</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-800/60 border border-blue-700/50">
          <User className="w-4 h-4 text-blue-300" />
          <span className="text-sm text-white font-medium">{user.name || user.username}</span>
          {user.role === "ADMIN" && (
            <Badge className="bg-amber-500 text-white border-0 text-xs px-1.5 py-0">Admin</Badge>
          )}
        </div>
        {user.role === "ADMIN" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin")}
            className="text-blue-300 hover:text-white hover:bg-blue-800"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-blue-300 hover:text-white hover:bg-blue-800"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
