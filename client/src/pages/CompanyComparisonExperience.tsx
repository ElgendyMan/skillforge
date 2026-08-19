import PortalShell from "@/components/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { comparisonCsvColumns, downloadComparisonCsv, openComparisonPrintPreview, type ComparisonCsvColumn, type ComparisonExportRow } from "@/lib/comparisonExport";
import { trpc } from "@/lib/trpc";
import { BookmarkPlus, Check, Download, FileDown, FilterX, GitCompareArrows, LoaderCircle, MessageSquareText, Printer, Tag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const questionTypeLabels: Record<string, string> = { multiple_choice: "اختيار من متعدد", essay: "مقالي", code: "كود", vulnerability: "اكتشاف ثغرة", file_upload: "رفع ملف" };
const statusLabels: Record<string, string> = { accepted: "مقبول", rejected: "مرفوض", "under review": "تحت المراجعة" };
type DraftAnnotation = { note: string; tags: string };

function parseTags(value: string) {
  return Array.from(new Set(value.split(/[,،]/).map(tag => tag.trim()).filter(Boolean))).slice(0, 12);
}

export function CompanyComparison() {
  const [selected, setSelected] = useState<number[]>([]);
  const [jobTitle, setJobTitle] = useState<string | undefined>();
  const [questionType, setQuestionType] = useState<string | undefined>();
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [csvColumns, setCsvColumns] = useState<ComparisonCsvColumn[]>(comparisonCsvColumns.map(column => column.id));
  const [showColumns, setShowColumns] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DraftAnnotation>>({});

  const queryInput = useMemo(() => ({
    jobTitle,
    questionType: questionType as "multiple_choice" | "essay" | "code" | "vulnerability" | "file_upload" | undefined,
    submittedFrom: submittedFrom ? new Date(`${submittedFrom}T00:00:00`) : undefined,
    submittedTo: submittedTo ? new Date(`${submittedTo}T23:59:59.999`) : undefined,
  }), [jobTitle, questionType, submittedFrom, submittedTo]);
  const filterOptions = trpc.reviewTools.comparisonFilters.useQuery();
  const candidates = trpc.reviewTools.comparisonCandidates.useQuery(queryInput);
  const comparison = trpc.reviewTools.comparison.useQuery({ attemptIds: selected }, { enabled: selected.length >= 2 });
  const templates = trpc.reviewTools.templates.list.useQuery();
  const me = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const createTemplate = trpc.reviewTools.templates.create.useMutation({ onSuccess: () => { setTemplateName(""); utils.reviewTools.templates.list.invalidate(); toast.success("تم حفظ قالب الفلاتر للفريق."); }, onError: error => toast.error(error.message) });
  const removeTemplate = trpc.reviewTools.templates.remove.useMutation({ onSuccess: () => { utils.reviewTools.templates.list.invalidate(); toast.success("تم حذف القالب."); }, onError: error => toast.error(error.message) });
  const saveAnnotation = trpc.reviewTools.candidateAnnotations.upsert.useMutation({ onSuccess: () => { comparison.refetch(); toast.success("تم حفظ ملاحظة المرشح ووسومه."); }, onError: error => toast.error(error.message) });

  useEffect(() => {
    const visible = new Set((candidates.data ?? []).map(row => row.attempt.id));
    setSelected(previous => previous.filter(id => visible.has(id)));
  }, [candidates.data]);
  useEffect(() => {
    setDrafts(previous => {
      const next = { ...previous };
      (comparison.data ?? []).forEach(row => {
        if (!next[row.attempt.id]) next[row.attempt.id] = { note: row.annotation?.note ?? "", tags: (row.annotation?.tags ?? []).join("، ") };
      });
      return next;
    });
  }, [comparison.data]);

  const exportRows = useMemo<ComparisonExportRow[]>(() => (comparison.data ?? []).map(row => ({
    candidateName: row.candidate.name ?? "مرشح",
    jobTitle: row.test.jobTitle ?? row.test.title,
    testTitle: row.test.title,
    score: row.attempt.reviewerScore ?? row.attempt.autoScore,
    priority: row.attempt.priorityScore,
    status: statusLabels[row.attempt.applicationStatus] ?? row.attempt.applicationStatus,
    integrityFlags: row.attempt.integrityFlags,
    skills: Array.isArray(row.profile?.skills) ? row.profile.skills : [],
    submittedAt: row.attempt.submittedAt,
  })), [comparison.data]);
  const exportFilters = { jobTitle, questionType: questionType ? questionTypeLabels[questionType] : undefined, submittedFrom, submittedTo };
  const resetFilters = () => { setJobTitle(undefined); setQuestionType(undefined); setSubmittedFrom(""); setSubmittedTo(""); };
  const toggle = (id: number) => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : previous.length < 4 ? [...previous, id] : (toast.error("الحد الأقصى 4 مرشحين."), previous));
  const toggleColumn = (column: ComparisonCsvColumn) => setCsvColumns(previous => previous.includes(column) ? previous.length > 1 ? previous.filter(item => item !== column) : (toast.error("لازم تختار عمود واحد على الأقل."), previous) : [...previous, column]);
  const applyTemplate = (template: NonNullable<typeof templates.data>[number]) => { setJobTitle(template.jobTitle ?? undefined); setQuestionType(template.questionType ?? undefined); setSubmittedFrom(template.submittedFrom ? new Date(template.submittedFrom).toISOString().slice(0, 10) : ""); setSubmittedTo(template.submittedTo ? new Date(template.submittedTo).toISOString().slice(0, 10) : ""); toast.success(`تم تطبيق قالب: ${template.name}`); };
  const finishExport = () => window.setTimeout(() => setExporting(null), 500);
  const exportCsv = () => { setExporting("csv"); try { downloadComparisonCsv(exportRows, csvColumns); toast.success("تم تنزيل ملف CSV بنجاح."); } catch { toast.error("تعذر إنشاء ملف CSV."); } finally { finishExport(); } };
  const exportPdf = () => { setExporting("pdf"); try { if (!openComparisonPrintPreview(exportRows, exportFilters)) toast.error("المتصفح منع نافذة المعاينة. اسمح بالنوافذ المنبثقة وحاول تاني."); else toast.success("تم فتح معاينة PDF. اختر حفظ كـ PDF من نافذة الطباعة."); } finally { finishExport(); } };

  return <PortalShell role="company"><main className="page-wrap overflow-x-hidden"><header className="mb-6 flex flex-col gap-4 sm:mb-8 xl:flex-row xl:items-end xl:justify-between"><div><p className="eyebrow">Candidate comparison</p><h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">قارن المرشحين جنبًا إلى جنب.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">أضف ملاحظات ووسوم داخلية، فلتر المحاولات، ثم شارك النتيجة مع فريق التوظيف.</p></div>{exportRows.length >= 2 && <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap"><Button variant="outline" onClick={() => setShowColumns(previous => !previous)} disabled={Boolean(exporting)} className="border-white/10 bg-white/[.03] text-slate-200"><FileDown className="ml-2 h-4 w-4"/>أعمدة CSV</Button><Button variant="outline" onClick={exportCsv} disabled={Boolean(exporting)} className="border-white/10 bg-white/[.03] text-slate-200">{exporting === "csv" ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin"/> : <Download className="ml-2 h-4 w-4"/>}{exporting === "csv" ? "جاري تجهيز CSV..." : "تصدير CSV"}</Button><Button onClick={exportPdf} disabled={Boolean(exporting)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{exporting === "pdf" ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin"/> : <Printer className="ml-2 h-4 w-4"/>}{exporting === "pdf" ? "جاري تجهيز PDF..." : "حفظ PDF"}</Button></div>}</header>
    {showColumns && <section className="glass-panel mb-5 p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-white">اختار أعمدة ملف CSV</h2><span className="text-xs text-cyan-200">{csvColumns.length}/{comparisonCsvColumns.length}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{comparisonCsvColumns.map(column => <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/8 bg-white/[.02] px-3 py-2 text-sm text-slate-300"><input type="checkbox" checked={csvColumns.includes(column.id)} onChange={() => toggleColumn(column.id)} className="accent-cyan-300"/>{column.label}</label>)}</div></section>}
    <details open className="glass-panel group mb-5 overflow-hidden p-0"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-white marker:hidden"><span className="flex items-center gap-2"><FilterX className="h-4 w-4 text-cyan-200"/>فلاتر المقارنة</span><span className="text-xs text-slate-500 transition group-open:rotate-180">⌄</span></summary><div className="grid gap-3 border-t border-white/5 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]"><Select value={jobTitle ?? "all"} onValueChange={value => setJobTitle(value === "all" ? undefined : value)}><SelectTrigger className="border-white/10 bg-white/[.03] text-slate-300"><SelectValue placeholder="كل المسميات الوظيفية"/></SelectTrigger><SelectContent><SelectItem value="all">كل المسميات الوظيفية</SelectItem>{filterOptions.data?.jobTitles.map(title => <SelectItem key={title} value={title}>{title}</SelectItem>)}</SelectContent></Select><Select value={questionType ?? "all"} onValueChange={value => setQuestionType(value === "all" ? undefined : value)}><SelectTrigger className="border-white/10 bg-white/[.03] text-slate-300"><SelectValue placeholder="كل أنواع الأسئلة"/></SelectTrigger><SelectContent><SelectItem value="all">كل أنواع الأسئلة</SelectItem>{filterOptions.data?.questionTypes.map(type => <SelectItem key={type} value={type}>{questionTypeLabels[type]}</SelectItem>)}</SelectContent></Select><label className="grid gap-1 text-xs text-slate-500">من تاريخ<Input type="date" value={submittedFrom} onChange={event => setSubmittedFrom(event.target.value)} className="border-white/10 bg-white/[.03] text-white"/></label><label className="grid gap-1 text-xs text-slate-500">إلى تاريخ<Input type="date" value={submittedTo} onChange={event => setSubmittedTo(event.target.value)} className="border-white/10 bg-white/[.03] text-white"/></label><Button variant="outline" onClick={resetFilters} className="border-white/10 bg-white/[.03] text-slate-300"><FilterX className="ml-2 h-4 w-4"/>مسح</Button></div></details>
    <section className="glass-panel mb-5 p-4"><div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]"><Input value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="اسم قالب الفلاتر، مثال: Pentest منتصف أغسطس" className="border-white/10 bg-white/[.03] text-white"/><Select onValueChange={id => { const template = templates.data?.find(item => item.id === Number(id)); if (template) applyTemplate(template); }}><SelectTrigger className="border-white/10 bg-white/[.03] text-slate-300"><SelectValue placeholder="تطبيق قالب محفوظ"/></SelectTrigger><SelectContent>{templates.data?.map(template => <SelectItem key={template.id} value={String(template.id)}>{template.name}</SelectItem>)}</SelectContent></Select><Button onClick={() => createTemplate.mutate({ name: templateName, filters: queryInput })} disabled={!templateName.trim() || createTemplate.isPending} className="bg-violet-300 text-slate-950 hover:bg-violet-200"><BookmarkPlus className="ml-2 h-4 w-4"/>حفظ القالب</Button></div>{templates.data?.length ? <div className="mt-3 flex flex-wrap gap-2">{templates.data.map(template => <span key={template.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.02] px-3 py-1 text-xs text-slate-300"><button onClick={() => applyTemplate(template)} className="hover:text-cyan-100">{template.name}</button>{template.createdByUserId === me.data?.id && <button onClick={() => removeTemplate.mutate({ templateId: template.id })} className="text-rose-300" aria-label={`حذف قالب ${template.name}`}><Trash2 className="h-3.5 w-3.5"/></button>}</span>)}</div> : <p className="mt-3 text-xs text-slate-500">القوالب المحفوظة هتكون متاحة لكل فريق شركتك.</p>}</section>
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"><section className="glass-panel max-h-[50vh] overflow-auto p-4 xl:max-h-[70vh]"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">اختار محاولات</span><Badge variant="outline" className="border-cyan-300/20 text-cyan-100">{selected.length}/4</Badge></div>{candidates.isLoading ? <div className="h-48 animate-pulse rounded-xl bg-white/[.03]"/> : candidates.data?.length ? candidates.data.map(row => <button key={row.attempt.id} onClick={() => toggle(row.attempt.id)} className={`mb-2 w-full rounded-xl border p-3 text-right transition ${selected.includes(row.attempt.id) ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/8 bg-white/[.02] hover:bg-white/[.05]"}`}><div className="flex items-center justify-between gap-3"><span className="truncate text-sm text-white">{row.candidate.name ?? "مرشح"}</span><span className="mono shrink-0 text-xs text-cyan-200">{row.attempt.priorityScore}</span></div><p className="mt-1 truncate text-xs text-slate-500">{row.test.jobTitle ?? row.test.title}</p><p className="mt-1 truncate text-[11px] text-slate-600">{row.test.title} · {row.attempt.submittedAt ? new Date(row.attempt.submittedAt).toLocaleDateString("ar-EG") : "غير مسلّم"}</p></button>) : <p className="p-5 text-center text-sm leading-7 text-slate-500">مفيش محاولات مطابقة للفلاتر الحالية.</p>}</section>
      <section>{selected.length < 2 ? <div className="glass-panel grid min-h-72 place-items-center p-8 text-center"><GitCompareArrows className="h-7 w-7 text-cyan-200"/><div><h2 className="mt-3 text-lg font-semibold">اختار مرشحين على الأقل</h2><p className="mt-2 text-sm text-slate-400">هتظهر الدرجة والحالة والأولوية والمهارات والملاحظات بشكل متجاور.</p></div></div> : comparison.data ? <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{comparison.data.map(row => { const draft = drafts[row.attempt.id] ?? { note: "", tags: "" }; const tags = parseTags(draft.tags); return <article key={row.attempt.id} className="glass-panel min-w-0 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-white">{row.candidate.name ?? "مرشح"}</h2><p className="mt-1 truncate text-xs text-slate-500">{row.profile?.headline ?? "ملف مهني"}</p></div><span className="mono shrink-0 text-lg text-cyan-200">{row.attempt.priorityScore}</span></div><div className="mt-4 space-y-2 border-t border-white/8 pt-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">المسمى</span><span className="truncate text-white">{row.test.jobTitle ?? row.test.title}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">النتيجة</span><span className="text-white">{row.attempt.reviewerScore ?? row.attempt.autoScore ?? "—"}%</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">الحالة</span><span className="text-white">{statusLabels[row.attempt.applicationStatus]}</span></div><p className="border-t border-white/8 pt-2 text-xs leading-6 text-slate-400">{Array.isArray(row.profile?.skills) ? row.profile.skills.join(" · ") : "لا توجد مهارات مضافة"}</p></div><section className="mt-4 rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-3"><div className="flex items-center gap-2 text-xs font-medium text-violet-100"><MessageSquareText className="h-3.5 w-3.5"/>ملاحظات فريق التوظيف</div><Textarea value={draft.note} onChange={event => setDrafts(previous => ({ ...previous, [row.attempt.id]: { ...draft, note: event.target.value } }))} rows={3} maxLength={3000} placeholder="ملاحظات خاصة بالفريق فقط..." className="mt-2 border-white/10 bg-slate-950/40 text-sm text-white"/><label className="mt-2 grid gap-1 text-[11px] text-slate-400"><span className="flex items-center gap-1"><Tag className="h-3 w-3"/>وسوم مفصولة بفاصلة</span><Input value={draft.tags} onChange={event => setDrafts(previous => ({ ...previous, [row.attempt.id]: { ...draft, tags: event.target.value } }))} maxLength={500} placeholder="قوي في Burp، مناسب للمقابلة" className="h-8 border-white/10 bg-slate-950/40 text-xs text-white"/></label>{tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{tags.map(tag => <Badge key={tag} variant="outline" className="border-violet-300/20 bg-violet-300/10 text-[10px] text-violet-100">{tag}</Badge>)}</div>}<Button size="sm" onClick={() => saveAnnotation.mutate({ attemptId: row.attempt.id, note: draft.note, tags })} disabled={saveAnnotation.isPending} className="mt-3 w-full bg-violet-300 text-slate-950 hover:bg-violet-200">{saveAnnotation.isPending ? <LoaderCircle className="ml-2 h-3.5 w-3.5 animate-spin"/> : <Check className="ml-2 h-3.5 w-3.5"/>}حفظ الملاحظة</Button></section></article>; })}</div> : <div className="glass-panel h-80 animate-pulse"/>}</section></div>
  </main></PortalShell>;
}
