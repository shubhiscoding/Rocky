'use client';

import { LogOut, Wallet } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/hooks/use-user';

export const AppSidebarUser = () => {
  const { isLoading, user, logout } = useUser();
  const privyUser = user?.privyUser;
  const isMobile = useIsMobile();

  const walletAddress = user?.wallets?.[0]?.publicKey;
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
    : null;

  const twitterUsername = privyUser?.twitter?.username;
  const twitterProfileImage = privyUser?.twitter?.profilePictureUrl;
  const emailAddress = privyUser?.email?.address;

  const displayName = twitterUsername
    ? `@${twitterUsername}`
    : emailAddress ?? shortAddress ?? 'Wallet';

  const initials = displayName.replace('@', '').slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isLoading || !privyUser ? (
              <SidebarMenuButton size="lg">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="grid flex-1 gap-1 text-left text-sm leading-tight">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-teal-500/10 data-[state=open]:text-teal-400"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={twitterProfileImage || undefined} />
                  <AvatarFallback className="rounded-lg bg-teal-500/20 text-xs font-bold text-teal-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  {shortAddress && (
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {shortAddress}
                    </span>
                  )}
                </div>
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-52 rounded-xl"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={6}
          >
            {walletAddress && (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `https://solscan.io/account/${walletAddress}`,
                      '_blank',
                    )
                  }
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  View on Solscan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
