'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { HomeIcon } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { IS_BETA } from '@/lib/constants';

import { AppSidebarConversations } from './app-sidebar-conversations';
import { AppSidebarUser } from './app-sidebar-user';

const AppSidebarHeader = () => {
  return (
    <SidebarHeader>
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 text-xs font-black text-white shadow-sm">
            ✦
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-teal-400">
              Rocky
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              AUDD Agent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {IS_BETA && (
            <span className="select-none rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-medium text-teal-400 ring-1 ring-teal-500/30 group-data-[collapsible=icon]:hidden">
              BETA
            </span>
          )}
        </div>
      </div>
    </SidebarHeader>
  );
};

const NavItems = [
  { title: 'Home', url: '/home', segment: 'home', icon: HomeIcon },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="hidden md:flex">
      <AppSidebarHeader />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.segment === 'home'
                        ? pathname === '/home'
                        : pathname.startsWith(`/${item.segment}`)
                    }
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <AppSidebarConversations />
      </SidebarContent>

      <SidebarFooter>
        <AppSidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
