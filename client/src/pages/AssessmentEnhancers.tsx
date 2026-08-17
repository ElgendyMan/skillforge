import PortalShell from "@/components/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AUTOSAVE_STATUS_EVENT, autosaveStatusLabel, formatAttemptCountdown, shouldWarnAboutTime, type AutosaveStatus } from "@/lib/assessmentSafety";
import { trpc } from "@/lib/trpc";
import { Clock3, GitCompareArrows, MessageSquareText, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";
import { LegacyReviewAttempt, LegacyTestRunner } from "./Platform";

function EditorSafetyStatus({ attemptId }: { attemptId: number }) {
  const attempt = trpc.candidate.attempts.get.useQuery({ attemptId }, { enabled: Number.isFinite(attemptId) });
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  useEffect(() => {
    if (!attempt.data?.attempt.expiresAt) return;
    const update = () => setSeconds(Math.max(0, Math.floor((new Date(attempt.data!.attempt.expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [attempt.data?.attempt.expiresAt]);
  useEffect(() => {
    const listener = (event: Event) => setStatus((event as CustomEvent<AutosaveStatus>).detail);
    window.addEventListener(AUTOSAVE_STATUS_EVENT, listener);
    return () => window.removeEventListener(AUTOSAVE_STATUS_EVENT, listener);
  }, []);
  const statusColor = status === "error" ? "text-rose-200" : status === "saved" ? "text-emerald-200" : "text-amber-200";
  return <div className="fixed bottom-5 left-5 z-40 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-[#0b1729]/95 px-4 py-3 shadow-2xl backdrop-blur" dir="rtl"><Clock3 className="h-4 w-4 text-cyan-200"/><span className={`mono text-sm ${shouldWarnAboutTime(seconds) ? "text-rose-200" : "text-cyan-100"}`}>{formatAttemptCountdown(seconds)}</span><span className="h-4 w-px bg-white/10"/><span className={`flex items-center gap-1 text-xs ${statusColor}`}><Save className="h-3.5 w-3.5"/>{autosaveStatusLabel(status)}</span></div>;
}

export function TestRunner() { const [, params] = useRoute("/attempt/:id"); const attemptId = Number(params?.id); return <><LegacyTestRunner/><EditorSafetyStatus attemptId={attemptId}/></>; }

function CodeCommentsOverlay({ attemptId }: { attemptId: number }) {
  const detail = trpc.company.attempts.detail.useQuery({ attemptId }, { enabled: Number.isFinite(attemptId) });
  const comments = trpc.reviewTools.comments.list.useQuery({ attemptId }, { enabled: Number.isFinite(attemptId) });
  const me = trpc.auth.me.useQuery();
  const create = trpc.reviewTools.comments.create.useMutation({ onSuccess: () => { comments.refetch(); setBody(""); toast.success("تمت إضافة تعليق السطر."); }, onError: error => toast.error(error.message) });
  const remove = trpc.reviewTools.comments.remove.useMutation({ onSuccess: () => { comments.refetch(); toast.success("تم حذف تعليقك."); }, onError: error => toast.error(error.message) });
  const [open, setOpen] = useState(false);
  const codeAnswers = useMemo(() => (detail.data?.answers ?? []).filter(answer => Boolean(answer.codeAnswer)), [detail.data?.answers]);
  const [answerId, setAnswerId] = useState<number | null>(null);
  const [lineNumber, setLineNumber] = useState("1");
  const [body, setBody] = useState("");
  const selected = codeAnswers.find(answer => answer.id === answerId) ?? codeAnswers[0];
  useEffect(() => { if (selected) { setAnswerId(selected.id); setLineNumber("1"); } }, [selected?.id]);
  const lines = (selected?.codeAnswer ?? "").split("\n");
  return <><Button onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-40 bg-violet-300 text-slate-950 shadow-xl shadow-violet-900/30 hover:bg-violet-200"><MessageSquareText className="ml-2 h-4 w-4"/>تعليقات الكود</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border-white/10 bg-[#0b1729] text-white" dir="rtl"><DialogHeader><DialogTitle>تعليقات على سطور الكود</DialogTitle><DialogDescription className="text-slate-400">اختار سطر من كود المرشح واكتب ملاحظة مراجعة. التعليقات دي متاحة لشركتك فقط.</DialogDescription></DialogHeader>{detail.data ? <div className="grid gap-5 lg:grid-cols-[1fr_340px]"><section className="rounded-xl border border-white/10 bg-slate-950/70 p-3" dir="ltr"><pre className="mono text-xs leading-6 text-slate-200">{lines.map((line, index) => <button type="button" key={index} onClick={() => setLineNumber(String(index + 1))} className={`block w-full whitespace-pre text-left ${Number(lineNumber) === index + 1 ? "bg-cyan-300/15 text-cyan-50" : "hover:bg-white/[.04]"}`}><span className="mr-4 inline-block w-7 select-none text-right text-slate-600">{index + 1}</span>{line || " "}</button>)}</pre></section><aside className="space-y-4"><Select value={selected ? String(selected.id) : undefined} onValueChange={value => setAnswerId(Number(value))}><SelectTrigger className="border-white/10 bg-white/[.03] text-slate-300"><SelectValue placeholder="اختار إجابة كود"/></SelectTrigger><SelectContent>{codeAnswers.map((answer, index) => <SelectItem key={answer.id} value={String(answer.id)}>إجابة كود {index + 1}</SelectItem>)}</SelectContent></Select><label className="grid gap-2 text-sm text-slate-300">رقم السطر<Input type="number" min="1" max={lines.length} value={lineNumber} onChange={event => setLineNumber(event.target.value)} className="border-white/10 bg-white/[.03] text-white"/></label><Textarea value={body} onChange={event => setBody(event.target.value)} rows={4} placeholder="اكتب ملاحظتك على السطر..." className="border-white/10 bg-white/[.03] text-white"/><Button onClick={() => selected && create.mutate({ attemptId, attemptAnswerId: selected.id, lineNumber: Number(lineNumber), body })} disabled={!selected || !body.trim() || create.isPending} className="w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">إضافة تعليق</Button><div className="max-h-64 space-y-2 overflow-auto">{comments.data?.map(item => { const isOwner = item.comment.reviewerUserId === me.data?.id; return <div key={item.comment.id} className="rounded-lg border border-white/8 p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs text-cyan-200">سطر {item.comment.lineNumber}</p>{isOwner ? <button onClick={() => remove.mutate({ commentId: item.comment.id })} disabled={remove.isPending} className="text-rose-300 disabled:opacity-50" aria-label="حذف تعليقي"><Trash2 className="h-3.5 w-3.5"/></button> : <span className="text-[10px] text-slate-500">تعليق مراجع آخر</span>}</div><p className="mt-2 text-sm leading-6 text-slate-300">{item.comment.body}</p></div>; })}</div></aside></div> : <p className="py-12 text-center text-slate-500">جاري تحميل كود المحاولة...</p>}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 bg-white/[.03] text-slate-300">إغلاق</Button></DialogFooter></DialogContent></Dialog></>;
}

export function ReviewAttempt() { const [, params] = useRoute("/company/review/:id"); const attemptId = Number(params?.id); return <><LegacyReviewAttempt/><CodeCommentsOverlay attemptId={attemptId}/></>; }

export function CompanyComparison() {
  const attempts = trpc.company.attempts.list.useQuery();
  const [selected, setSelected] = useState<number[]>([]);
  const comparison = trpc.reviewTools.comparison.useQuery({ attemptIds: selected }, { enabled: selected.length >= 2 });
  const toggle = (id: number) => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : previous.length < 4 ? [...previous, id] : previous);
  return <PortalShell role="company"><div className="page-wrap"><div className="mb-8"><p className="eyebrow">Candidate comparison</p><h1 className="mt-2 text-3xl font-semibold text-white">قارن المرشحين جنبًا إلى جنب.</h1><p className="mt-3 text-sm leading-7 text-slate-400">اختار من 2 إلى 4 مرشحين من محاولات شركتك. المقارنة مجرد أداة دعم قرار؛ راجع الإجابات وسجل الجلسة قبل الحكم.</p></div><div className="grid gap-5 xl:grid-cols-[340px_1fr]"><section className="glass-panel max-h-[70vh] overflow-auto p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">اختار محاولات</span><Badge variant="outline" className="border-cyan-300/20 text-cyan-100">{selected.length}/4</Badge></div>{attempts.data?.map(row => <button key={row.attempt.id} onClick={() => toggle(row.attempt.id)} className={`mb-2 w-full rounded-xl border p-3 text-right transition ${selected.includes(row.attempt.id) ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/8 bg-white/[.02] hover:bg-white/[.05]"}`}><div className="flex items-center justify-between"><span className="text-sm text-white">{row.candidate.name ?? "مرشح"}</span><span className="mono text-xs text-cyan-200">{row.attempt.priorityScore}</span></div><p className="mt-1 truncate text-xs text-slate-500">{row.test.title}</p></button>)}</section><section>{selected.length < 2 ? <div className="glass-panel grid min-h-80 place-items-center p-8 text-center"><GitCompareArrows className="h-7 w-7 text-cyan-200"/><div><h2 className="mt-3 text-lg font-semibold">اختار مرشحين على الأقل</h2><p className="mt-2 text-sm text-slate-400">هتظهر الدرجة والحالة والأولوية والمهارات بشكل متجاور.</p></div></div> : comparison.data ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{comparison.data.map(row => <article key={row.attempt.id} className="glass-panel p-5"><div className="flex items-start justify-between"><div><h2 className="font-semibold text-white">{row.candidate.name ?? "مرشح"}</h2><p className="mt-1 text-xs text-slate-500">{row.profile?.headline ?? "ملف مهني"}</p></div><span className="mono text-lg text-cyan-200">{row.attempt.priorityScore}</span></div><div className="mt-5 space-y-3 border-t border-white/8 pt-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">الاختبار</span><span className="max-w-32 truncate text-white">{row.test.title}</span></div><div className="flex justify-between"><span className="text-slate-500">النتيجة</span><span className="text-white">{row.attempt.reviewerScore ?? row.attempt.autoScore ?? "—"}%</span></div><div className="flex justify-between"><span className="text-slate-500">النزاهة</span><span className={row.attempt.integrityFlags ? "text-amber-200" : "text-emerald-300"}>{row.attempt.integrityFlags || "سليم"}</span></div><div className="flex justify-between"><span className="text-slate-500">الحالة</span><span className="text-white">{row.attempt.applicationStatus}</span></div><p className="border-t border-white/8 pt-3 text-xs leading-6 text-slate-400">{Array.isArray(row.profile?.skills) ? row.profile.skills.join(" · ") : "لا توجد مهارات مضافة"}</p></div></article>)}</div> : <div className="glass-panel h-80 animate-pulse"/>}</section></div></div></PortalShell>;
}
