import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { ChevronDown, LogOut, PanelLeft, type LucideIcon } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

export type DashboardNavItem = { icon: LucideIcon; label: string; path: string };
export type DashboardNavGroup = { label: string; items: DashboardNavItem[]; defaultOpen?: boolean };

type DashboardLayoutProps = {
  children: React.ReactNode;
  brand?: string;
  roleLabel?: string;
  items?: DashboardNavItem[];
  groups?: DashboardNavGroup[];
};

const SIDEBAR_WIDTH_KEY = "skillforge-sidebar-width";
const DEFAULT_WIDTH = 272;
const MIN_WIDTH = 220;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children, brand = "SkillForge", roleLabel = "Workspace", items = [], groups = [] }: DashboardLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user } = useAuth();

  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-[#07101f] p-6" dir="rtl"><div className="glass-panel max-w-md p-8 text-center"><p className="eyebrow">SkillForge Workspace</p><h1 className="mt-3 text-3xl font-semibold text-white">سجّل دخولك عشان تكمل</h1><p className="mt-3 text-sm leading-7 text-slate-400">المنصة بتحفظ محاولاتك وبياناتك بصورة معزولة وآمنة لكل حساب.</p><Button onClick={() => startLogin()} className="mt-7 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">تسجيل الدخول</Button></div></div>;
  }

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties} dir="rtl"><DashboardLayoutContent brand={brand} roleLabel={roleLabel} items={items} groups={groups} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, brand, roleLabel, items = [], groups = [], setSidebarWidth }: DashboardLayoutProps & { setSidebarWidth: (value: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [resizing, setResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const initialGroupState = useMemo(() => Object.fromEntries(groups.map(group => [group.label, group.defaultOpen ?? group.items.some(item => item.path === location)])), [groups, location]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialGroupState);

  useEffect(() => { setOpenGroups(previous => Object.fromEntries(groups.map(group => [group.label, previous[group.label] ?? group.defaultOpen ?? group.items.some(item => item.path === location)]))); }, [groups, location]);
  useEffect(() => {
    const move = (event: MouseEvent) => { if (!resizing) return; const right = sidebarRef.current?.getBoundingClientRect().right ?? event.clientX; const width = right - event.clientX; if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width); };
    const up = () => setResizing(false);
    if (resizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.userSelect = "none"; }
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.userSelect = ""; };
  }, [resizing, setSidebarWidth]);

  const navigate = (path: string) => { setLocation(path); if (isMobile) setOpenMobile(false); };
  const renderItem = (item: DashboardNavItem, nested = false) => nested ? <SidebarMenuSubItem key={item.path}><SidebarMenuSubButton asChild isActive={location === item.path} onClick={() => navigate(item.path)}><button type="button"><item.icon /><span>{item.label}</span></button></SidebarMenuSubButton></SidebarMenuSubItem> : <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => navigate(item.path)} tooltip={item.label} className="h-11 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white data-[active=true]:bg-cyan-300/10 data-[active=true]:text-cyan-200"><item.icon className="h-4 w-4"/><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>;

  return <>
    <div className="relative" ref={sidebarRef}>
      <Sidebar side="right" collapsible="icon" className="border-l border-white/5 bg-[#091425]">
        <SidebarHeader className="h-20 px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-violet-400 font-bold text-slate-950 shadow-lg shadow-cyan-900/20">SF</div><div className="group-data-[collapsible=icon]:hidden"><p className="text-sm font-bold tracking-tight text-white">{brand}</p><p className="mt-0.5 text-[11px] text-slate-400">{roleLabel}</p></div></div></SidebarHeader>
        <SidebarContent className="px-3">
          {items.length > 0 && <SidebarGroup className="px-0"><SidebarGroupContent><SidebarMenu>{items.map(item => renderItem(item))}</SidebarMenu></SidebarGroupContent></SidebarGroup>}
          {groups.map(group => <SidebarGroup key={group.label} className="px-0 pt-2"><SidebarGroupLabel className="h-8 px-2 text-[10px] uppercase tracking-[0.16em] text-slate-500 group-data-[collapsible=icon]:hidden"><button type="button" aria-expanded={Boolean(openGroups[group.label])} onClick={() => setOpenGroups(previous => ({ ...previous, [group.label]: !previous[group.label] }))} className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-right hover:bg-white/[.04] hover:text-slate-300"><span>{group.label}</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${openGroups[group.label] ? "rotate-180" : ""}`} /></button></SidebarGroupLabel><SidebarGroupContent className={openGroups[group.label] ? "" : "hidden"}><SidebarMenu><SidebarMenuSub>{group.items.map(item => renderItem(item, true))}</SidebarMenuSub></SidebarMenu></SidebarGroupContent></SidebarGroup>)}
        </SidebarContent>
        <SidebarFooter className="p-4"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-right transition-colors hover:bg-white/[0.06]"><Avatar className="h-8 w-8"><AvatarFallback className="bg-violet-400/15 text-xs text-violet-200">{user?.name?.slice(0, 1).toUpperCase() ?? "U"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-medium text-white">{user?.name ?? "حسابك"}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{user?.email ?? ""}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-48"><DropdownMenuItem onClick={logout} className="gap-2 text-destructive"><LogOut className="h-4 w-4"/>تسجيل الخروج</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter>
      </Sidebar>
      {!isMobile && <div className="absolute left-0 top-0 z-50 h-full w-1 cursor-col-resize hover:bg-cyan-300/30" onMouseDown={() => setResizing(true)} />}
    </div>
    <SidebarInset className="min-w-0 w-full max-w-full overflow-x-hidden bg-[#07101f]">{isMobile && <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center gap-3 border-b border-white/5 bg-[#07101f]/90 px-4 backdrop-blur"><SidebarTrigger className="shrink-0 text-slate-300"><PanelLeft /></SidebarTrigger><span className="truncate font-semibold text-white">{brand}</span></header>}<main className="min-h-screen min-w-0">{children}</main></SidebarInset>
  </>;
}
