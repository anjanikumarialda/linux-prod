'use client';

import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Key, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { useState } from "react";
import { IntervalKeyModal } from "@/components/dashboard/interval-key-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardNav() {
  const { data: session } = useSession();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  
  return (
    <nav className="border-b bg-background w-full">
      <div className="container max-w-7xl mx-auto flex h-16 items-center px-4">
        {/* Left section - Logo */}
        <div className="flex-1">
          <Logo height={24} width={108} />
        </div>

        {/* Center section - Title */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-lg font-semibold">Meeting Time Tracker</h1>
        </div>

        {/* Right section - Theme toggle and Profile */}
        <div className="flex-1 flex items-center justify-end space-x-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent cursor-pointer">
                {session?.user?.image ? (
                  <img 
                    src={session.user.image} 
                    alt="Profile" 
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs text-primary/80">
                      {session?.user?.name?.[0] || 'U'}
                    </span>
                  </div>
                )}
                <span className="text-sm">{session?.user?.name?.split(' ')[0]}</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem className="flex items-center" onSelect={() => setShowApiKeyModal(true)}>
                <Key className="h-4 w-4 mr-2" />
                <span>Intervals API Key</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center" onSelect={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <IntervalKeyModal
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
      />
    </nav>
  );
} 