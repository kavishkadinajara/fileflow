"use client";

/**
 * Header user button.
 *
 * - Initialises the auth session on mount (idempotent).
 * - When signed out: shows a "Sign in" button that opens the AuthDialog.
 * - When signed in: shows a dropdown with the user's email + a sign-out action.
 * - When Supabase is not configured: renders nothing (silent disable).
 */
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { LogOut, User, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function UserButton() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const init = useAuthStore((s) => s.init);
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => { init(); }, [init]);

  if (!isCloudEnabled()) return null;
  if (!ready) return <div className="h-8 w-20 rounded-md bg-muted/50 animate-pulse" />;

  if (!user) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="h-8 text-xs gap-1.5">
          <User className="h-3.5 w-3.5" />
          Sign in
        </Button>
        <AuthDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 px-2 flex items-center gap-2 rounded-md hover:bg-muted transition-colors text-xs"
          title={user.email ?? ""}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand text-white text-[10px] font-bold">
            {initials}
          </span>
          <span className="hidden sm:inline max-w-[140px] truncate text-foreground/80">{user.email}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-xs font-medium truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/my-templates" className="cursor-pointer">
            <FolderOpen className="h-3.5 w-3.5 mr-2" />
            My Templates
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/community" className="cursor-pointer">
            <User className="h-3.5 w-3.5 mr-2" />
            Community
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-red-600 dark:text-red-400 cursor-pointer">
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
