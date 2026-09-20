import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowUpRight, BarChart3, CheckCircle2, ChevronRight, CircleAlert, FileText, Loader2, ShieldCheck, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type Metric = { label: string; value: string; change: string; tone: "positive" | "negative" | "neutral" };
const sample = {
  id: 1,
  fileName: "northstar-systems-q2-fy26.pdf",
  company: "Northstar Systems",
  period: "Q2 FY26 Earnings Release",
  headline: "Growth is accelerating, but cash conversion softened.",
  summary: "Northstar delivered a strong quarter with broad-based demand across its platform and a second consecutive period of margin expansion. Revenue growth outpaced guidance, while management raised its full-year outlook. The key watch item is cash conversion: inventory investment and longer enterprise collections pulled free cash flow below the pace implied by earnings.",
  highlights: ["Revenue of $2.84B grew 18.4% year over year, led by enterprise subscriptions and international expansion.", "Adjusted EBITDA margin expanded 120 bps as hosting costs normalized and sales efficiency improved.", "Management raised FY26 revenue guidance by 150 bps, citing healthy pipeline coverage and renewal rates."],
  metrics: [{ label: "Revenue", value: "$2.84B", change: "+18.4% YoY", tone: "positive" }, { label: "Adj. EBITDA", value: "$642M", change: "+23.1% YoY", tone: "positive" }, { label: "Free cash flow", value: "$318M", change: "-6.8% YoY", tone: "negative" }] as Metric[],
  risks: ["Cash conversion is weakening as inventory and receivables absorb more working capital.", "International expansion may keep near-term operating expense elevated.", "The raised outlook assumes continued renewal strength in a more selective enterprise budget environment."],
  actions: ["Reconcile the 18.4% revenue growth with regional and product-level contribution in the filing.", "Track days sales outstanding and inventory turns next quarter.", "Pressure-test FY26 margin assumptions against the pace of hiring and expansion spend."],
  sentiment: "Positive",
  confidence: 88,
};

function parseArray(value: unknown, fallback: unknown[]) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return fallback;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; }
}
function dateLabel(value: Date | string | null | undefined) { return value ? new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Today"; }

export default function ReportDetail() {
  const [, params] = useRoute("/reports/:id");
  const id = Number(params?.id);
  const query = trpc.reports.get.useQuery({ id }, { enabled: Number.isFinite(id) && id > 0 });
  const report = query.data || (id === 1 ? sample : undefined);
  if (query.isLoading && !report) return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f4]"><Loader2 className="h-6 w-6 animate-spin text-[#41836a]" /></div>;
  if (!report) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f7f4] text-center"><CircleAlert className="h-8 w-8 text-[#bb735d]" /><h1 className="font-display text-xl font-extrabold text-[#244e42]">Report not found</h1><Link href="/"><Button className="bg-[#10483f]">Back to overview</Button></Link></div>;

  const highlights = parseArray(report.highlights, sample.highlights) as string[];
  const risks = parseArray(report.risks, sample.risks) as string[];
  const actions = parseArray(report.actions, sample.actions) as string[];
  const metrics = parseArray(report.metrics, sample.metrics) as Metric[];
  const confidence = report.confidence ?? sample.confidence;
  const sentiment = report.sentiment || sample.sentiment;

  return <div className="min-h-screen bg-[#f4f7f4] text-[#14201d]">
    <header className="sticky top-0 z-20 border-b border-[#dfe9e1] bg-[#f8faf8]/90 backdrop-blur-md"><div className="mx-auto flex h-[70px] max-w-[1180px] items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-2.5 text-[#10483f]"><div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#10483f] text-[#dcf7df]"><Sparkles className="h-4 w-4" /></div><span className="font-display text-[16px] font-extrabold tracking-[-0.04em]">FinBrief</span></Link><div className="flex items-center gap-2"><Link href="/"><Button variant="outline" className="h-9 border-[#d8e5db] bg-white text-[11px] font-bold text-[#4c6b5d]"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Overview</Button></Link><Button className="hidden h-9 bg-[#10483f] text-[11px] font-bold text-white sm:flex" onClick={() => window.print()}><FileText className="mr-1.5 h-3.5 w-3.5" /> Export brief</Button></div></div></header>
    <main className="mx-auto max-w-[1180px] px-5 py-7 sm:px-8 lg:py-10">
      <div className="mb-7 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#899990]"><Link href="/" className="hover:text-[#3d8065]">Workspace</Link><ChevronRight className="h-3 w-3" /><span>Report brief</span><ChevronRight className="h-3 w-3" /><span className="text-[#416a5a]">{report.company || report.fileName}</span></div>
      <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2"><Badge className="border-0 bg-[#e0f3e3] text-[10px] font-bold uppercase tracking-[0.1em] text-[#34775a]">AI-generated brief</Badge><span className="text-[11px] text-[#91a097]">Analyzed {dateLabel("createdAt" in report ? report.createdAt : undefined)}</span></div><h1 className="max-w-[760px] font-display text-[31px] font-extrabold leading-[1.12] tracking-[-0.05em] text-[#173e34] sm:text-[42px]">{report.headline || sample.headline}</h1><p className="mt-3 text-[14px] font-medium text-[#708178]">{report.company || sample.company} <span className="mx-1.5 text-[#b9c7bd]">·</span> {report.period || sample.period}</p></div><div className="flex items-center gap-3 rounded-[13px] border border-[#d9e8dc] bg-[#f3faf3] px-4 py-3"><div className="relative flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-[#cce8d0] text-[13px] font-extrabold text-[#34775a]" style={{ background: `conic-gradient(#5aa77c ${confidence * 3.6}deg, #e5eee6 0deg)` }}><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3faf3]">{confidence}%</div></div><div><div className="text-[11px] font-bold text-[#487561]">Analyst confidence</div><div className="mt-0.5 text-[10px] text-[#86a095]">Based on source coverage</div></div></div></section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.7fr)]"><Card className="paper-shadow border-0 bg-white"><CardHeader className="flex flex-row items-center justify-between px-6 pb-3 pt-6"><CardTitle className="font-display text-[16px] font-extrabold text-[#244e42]">Executive readout</CardTitle><Badge className={`border-0 text-[10px] font-bold ${sentiment === "Positive" ? "bg-[#e0f3e3] text-[#34775a]" : "bg-[#fff0d5] text-[#95691e]"}`}><span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" /> {sentiment} outlook</Badge></CardHeader><CardContent className="px-6 pb-6"><p className="text-[15px] leading-[1.75] text-[#52675d]">{report.summary || sample.summary}</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{metrics.map((metric, index) => <div key={`${metric.label}-${index}`} className="rounded-[12px] bg-[#f6faf6] p-3.5"><div className="text-[11px] font-semibold text-[#7d8d84]">{metric.label}</div><div className="mt-1.5 flex items-end justify-between gap-2"><span className="font-display text-[21px] font-extrabold tracking-[-0.04em] text-[#255746]">{metric.value}</span>{metric.tone === "negative" ? <TrendingDown className="mb-1 h-4 w-4 text-[#c77768]" /> : <TrendingUp className="mb-1 h-4 w-4 text-[#55a47b]" />}</div><div className={`mt-1 text-[10px] font-bold ${metric.tone === "negative" ? "text-[#b86658]" : metric.tone === "positive" ? "text-[#4a916d]" : "text-[#778980]"}`}>{metric.change}</div></div>)}</div></CardContent></Card>
        <Card className="border-0 bg-[#10483f] text-white shadow-[0_16px_38px_rgba(16,72,63,.17)]"><CardContent className="flex h-full flex-col p-6"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#a8d2b4]"><Target className="h-3.5 w-3.5" /> Bottom line</div><p className="mt-5 font-display text-[20px] font-extrabold leading-[1.25] tracking-[-0.04em] text-[#effcf0]">The operating story is improving faster than the cash story.</p><div className="mt-auto border-t border-[#39725f] pt-4"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#98c1a8]">Source document</div><div className="mt-1.5 flex items-center gap-2 text-[12px] font-semibold text-[#dcf4df]"><FileText className="h-3.5 w-3.5" />{report.fileName}</div></div></CardContent></Card></section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2"><Card className="border-0 bg-white soft-shadow"><CardHeader className="px-6 pb-2 pt-6"><CardTitle className="flex items-center gap-2 font-display text-[16px] font-extrabold text-[#244e42]"><BarChart3 className="h-4 w-4 text-[#4f9875]" /> What stood out</CardTitle></CardHeader><CardContent className="px-6 pb-6"><div className="space-y-4">{highlights.map((item, index) => <div key={index} className="flex gap-3"><div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e2f2e4] text-[10px] font-extrabold text-[#3e8665]">{index + 1}</div><p className="text-[13px] leading-[1.6] text-[#5f7368]">{item}</p></div>)}</div></CardContent></Card><Card className="border-0 bg-white soft-shadow"><CardHeader className="px-6 pb-2 pt-6"><CardTitle className="flex items-center gap-2 font-display text-[16px] font-extrabold text-[#244e42]"><CircleAlert className="h-4 w-4 text-[#d28a57]" /> Risks to keep on the radar</CardTitle></CardHeader><CardContent className="px-6 pb-6"><div className="space-y-4">{risks.map((item, index) => <div key={index} className="flex gap-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#e0a072]" /><p className="text-[13px] leading-[1.6] text-[#5f7368]">{item}</p></div>)}</div></CardContent></Card></section>

      <section className="mt-5 rounded-[16px] border border-[#d9e8dc] bg-[#eef7ef] p-5 sm:p-6"><div className="flex flex-col gap-5 md:flex-row md:items-start"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#d4edd9] text-[#43886a]"><CheckCircle2 className="h-5 w-5" /></div><div className="flex-1"><div className="font-display text-[16px] font-extrabold text-[#2c654f]">Suggested follow-ups</div><p className="mt-1 text-[12px] text-[#7c998a]">Use these prompts to take the analysis one step further.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{actions.map((item, index) => <div key={index} className="rounded-[11px] border border-[#d8e9db] bg-white/75 p-3.5 text-[12px] leading-[1.55] text-[#587467]"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#5b9b79]">Question {index + 1}</span>{item}</div>)}</div></div></div></section>
      <div className="mt-7 flex flex-col justify-between gap-3 border-t border-[#dfe9e1] pt-5 text-[10px] uppercase tracking-[0.1em] text-[#a1aea5] sm:flex-row"><span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-[#73a286]" /> Private workspace · AI-assisted, human-reviewed</span><span>FinBrief AI · not investment advice</span></div>
    </main>
  </div>;
}
