import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return <main dir="rtl" className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-[#07101f] px-5 text-right text-slate-100">
    <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_18%_18%,rgba(34,211,238,.12),transparent_25%),radial-gradient(circle_at_82%_76%,rgba(167,139,250,.11),transparent_24%)]" />
    <section className="relative w-full min-w-0 max-w-xl rounded-3xl border border-white/10 bg-slate-950/50 p-8 shadow-2xl backdrop-blur md:p-12">
      <div className="flex items-center justify-between gap-4"><span className="mono text-xs tracking-[.24em] text-cyan-200">SKILLFORGE · RECOVERY</span><span className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200"><ShieldAlert className="h-5 w-5" /></span></div>
      <p className="mt-10 text-6xl font-semibold tracking-tight text-white">404</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">المسار ده مش موجود.</h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">ممكن يكون الرابط اتغيّر أو الصفحة مش متاحة لحسابك. ارجع للمساحة الرئيسية واكمل من هناك.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => setLocation("/")} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><ArrowRight className="ml-2 h-4 w-4" />الرئيسية</Button><Button variant="outline" onClick={() => window.history.back()} className="border-white/10 bg-white/[.03] text-slate-200 hover:bg-white/[.07]"><Compass className="ml-2 h-4 w-4" />ارجع خطوة</Button></div>
    </section>
  </main>;
}
