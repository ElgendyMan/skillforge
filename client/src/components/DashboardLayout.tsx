import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LogOut, PanelLeft, type LucideIcon } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

export type DashboardNavItem = { icon: LucideIcon; label: string; path: string };

type DashboardLayoutProps = {
  children: React.ReactNode;
  brand?: string;
  roleLabel?: string;
  items?: DashboardNavItem[];
};

const SIDEBAR_WIDTH_KEY = "skillforge-sidebar-width";
const DEFAULT_WIDTH = 272;
const MIN_WIDTH = 220;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children, brand = "SkillForge", roleLabel = "Workspace", items = [] }: DashboardLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user } = useAuth();

  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return <div className="min-h-screen bg-[#07101f] flex items-center justify-center p-6" dir="rtl"><div className="glass-panel max-w-md p-8 text-center"><p className="eyebrow">SkillForge Workspace</p><h1 className="mt-3 text-3xl font-semibold text-white">سجّل دخولك عشان تكمل</h1><p className="mt-3 text-sm leading-7 text-slate-400">المنصة بتحفظ محاولاتك وبياناتك بصورة معزولة وآمنة لكل حساب.</p><Button onClick={() => startLogin()} className="mt-7 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">تسجيل الدخول</Button></div></div>;
  }

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties} dir="rtl"><DashboardLayoutContent brand={brand} roleLabel={roleLabel} items={items} setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, brand, roleLabel, items, setSidebarWidth }: DashboardLayoutProps & { setSidebarWidth: (value: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [resizing, setResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (event: MouseEvent) => { if (!resizing) return; const right = sidebarRef.current?.getBoundingClientRect().right ?? event.clientX; const width = right - event.clientX; if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width); };
    const up = () => setResizing(false);
    if (resizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.userSelect = "none"; }
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.userSelect = ""; };
  }, [resizing, setSidebarWidth]);

  return <>
    <div className="relative" ref={sidebarRef}>
      <Sidebar side="right" collapsible="icon" className="border-l border-white/5 bg-[#091425]">
        <SidebarHeader className="h-20 px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-violet-400 font-bold text-slate-950 shadow-lg shadow-cyan-900/20">SF</div><div className="group-data-[collapsible=icon]:hidden"><p className="text-sm font-bold tracking-tight text-white">{brand}</p><p className="mt-0.5 text-[11px] text-slate-400">{roleLabel}</p></div></div></SidebarHeader>
        <SidebarContent className="px-3"><SidebarMenu>{(items ?? []).map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white data-[active=true]:bg-cyan-300/10 data-[active=true]:text-cyan-200"><item.icon className="h-4 w-4"/><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent>
        <SidebarFooter className="p-4"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2 text-right transition-colors hover:bg-white/[0.06]"><Avatar className="h-8 w-8"><AvatarFallback className="bg-violet-400/15 text-xs text-violet-200">{user?.name?.slice(0, 1).toUpperCase() ?? "U"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-medium text-white">{user?.name ?? "حسابك"}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{user?.email ?? ""}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-48"><DropdownMenuItem onClick={logout} className="gap-2 text-destructive"><LogOut className="h-4 w-4"/>تسجيل الخروج</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter>
      </Sidebar>
      {!isMobile && <div className="absolute left-0 top-0 z-50 h-full w-1 cursor-col-resize hover:bg-cyan-300/30" onMouseDown={() => setResizing(true)} />}
    </div>
    <SidebarInset className="min-w-0 w-full max-w-full overflow-x-hidden bg-[#07101f]">{isMobile && <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center gap-3 border-b border-white/5 bg-[#07101f]/90 px-4 backdrop-blur"><SidebarTrigger className="shrink-0 text-slate-300"><PanelLeft /></SidebarTrigger><span className="truncate font-semibold text-white">{brand}</span></header>}<main className="min-h-screen min-w-0">{children}</main></SidebarInset>
  </>;
}
