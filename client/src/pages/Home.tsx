import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight, BarChart3, Bell, Check, ChevronRight, CircleHelp, Clock3,
  FileBarChart2, FileText, FolderOpen, LayoutDashboard, Loader2, LogIn,
  Menu, Plus, Search, ShieldCheck, Sparkles, UploadCloud, X, Zap,
} from "lucide-react";

const sampleReports = [
  { company: "Northstar Systems", period: "Q2 FY26", type: "Earnings release", tone: "positive", time: "12 min ago", initials: "NS" },
  { company: "Arcadia Energy", period: "FY25 Annual Report", type: "Annual filing", tone: "caution", time: "Yesterday", initials: "AE" },
  { company: "Lumen Health", period: "Q1 FY26", type: "Earnings call", tone: "mixed", time: "May 18, 2026", initials: "LH" },
];

const sampleMetrics = [
  { label: "Revenue", value: "$2.84B", change: "+18.4% YoY", positive: true },
  { label: "Adj. EBITDA", value: "$642M", change: "+23.1% YoY", positive: true },
  { label: "Free cash flow", value: "$318M", change: "-6.8% YoY", positive: false },
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toneClass(tone: string) {
  if (tone === "positive") return "bg-[#dff3e3] text-[#1c7156]";
  if (tone === "caution") return "bg-[#fff0d2] text-[#96681c]";
  return "bg-[#eceafa] text-[#60529a]";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReading, setIsReading] = useState(false);
  const utils = trpc.useUtils();
  const reports = trpc.reports.list.useQuery();
  const summarize = trpc.reports.summarize.useMutation({
    onSuccess: async (report) => {
      await utils.reports.list.invalidate();
      setSelectedFile(null);
      setIsReading(false);
      toast.success("Report analyzed", { description: `${report.company || report.fileName} is ready to review.` });
      setLocation(`/reports/${report.id}`);
    },
    onError: (error) => {
      setIsReading(false);
      toast.error("Could not analyze report", { description: error.message });
    },
  });

  const readAndSummarize = async (file: File) => {
    setSelectedFile(file);
    setIsReading(true);
    const isText = file.type.startsWith("text/") || /\.(csv|md|txt|log)$/i.test(file.name);
    try {
      let sourceText = "";
      let fileData = "";
      if (isText) {
        sourceText = await file.text();
      } else if (file.size <= 20 * 1024 * 1024) {
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("File could not be read"));
          reader.readAsDataURL(file);
        });
      }
      summarize.mutate({ fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, fileData, sourceText });
    } catch {
      setIsReading(false);
      toast.error("File could not be read", { description: "Try a PDF, TXT, CSV, or Markdown report." });
    }
  };

  const onPick = (file?: File) => {
    if (!file) return;
    const accepted = /\.(pdf|txt|csv|md|docx)$/i.test(file.name);
    if (!accepted) {
      toast.error("Unsupported file type", { description: "Upload a PDF, DOCX, TXT, CSV, or Markdown report." });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File is too large", { description: "Keep uploads under 20 MB." });
      return;
    }
    void readAndSummarize(file);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f4] text-[#14201d]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[238px] flex-col border-r border-[#dce7df] bg-[#fbfdfb] px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-9 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#10483f] text-[#dcf7df]"><Sparkles className="h-[18px] w-[18px]" /></div>
          <div><div className="font-display text-[17px] font-extrabold tracking-[-0.04em] text-[#10483f]">FinBrief</div><div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#86a095]">AI analyst workspace</div></div>
          <button className="ml-auto rounded-lg p-1 text-[#8fa098] hover:bg-[#edf2ee] lg:hidden" onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#97a9a0]">Workspace</div>
        <nav className="space-y-1">
          <button className="flex w-full items-center gap-3 rounded-[10px] bg-[#e3f1e5] px-3 py-2.5 text-left text-[13px] font-semibold text-[#145847]"><LayoutDashboard className="h-[17px] w-[17px]" /> Overview</button>
          <button onClick={() => inputRef.current?.click()} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-[#6c7c74] transition-colors hover:bg-[#edf2ee] hover:text-[#145847]"><UploadCloud className="h-[17px] w-[17px]" /> New analysis <span className="ml-auto text-[10px] text-[#a2b1aa]">⌘U</span></button>
          <button onClick={() => toast.info("Search is coming soon", { description: "Your report library will be searchable across companies and metrics." })} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-[#6c7c74] transition-colors hover:bg-[#edf2ee] hover:text-[#145847]"><Search className="h-[17px] w-[17px]" /> Search reports</button>
        </nav>
        <div className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#97a9a0]">Your library</div>
        <nav className="space-y-1">
          <button onClick={() => toast.info("Collections are coming soon")} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-[#6c7c74] transition-colors hover:bg-[#edf2ee] hover:text-[#145847]"><FolderOpen className="h-[17px] w-[17px]" /> Collections</button>
          <button onClick={() => toast.info("Alerts are coming soon")} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-medium text-[#6c7c74] transition-colors hover:bg-[#edf2ee] hover:text-[#145847]"><Bell className="h-[17px] w-[17px]" /> Alerts <span className="ml-auto rounded-full bg-[#f3d6c4] px-1.5 py-0.5 text-[10px] font-bold text-[#a45d3e]">2</span></button>
        </nav>
        <div className="mt-auto rounded-[14px] bg-[#e7f2e8] p-3.5">
          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#c9e8d1] text-[#276951]"><Zap className="h-3.5 w-3.5" /></div>
          <div className="text-[12px] font-bold text-[#1d5947]">Your analyst is ready</div>
          <p className="mt-1 text-[11px] leading-[1.45] text-[#638378]">Upload a report and get a decision-ready brief in seconds.</p>
          <button onClick={() => inputRef.current?.click()} className="mt-3 text-[11px] font-bold text-[#1b6e55] hover:underline">Start an analysis <ArrowUpRight className="ml-0.5 inline h-3 w-3" /></button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[238px]">
        <header className="flex h-[70px] items-center justify-between border-b border-[#e2ebe4] bg-[#f8faf8]/85 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3"><button className="rounded-lg p-1.5 text-[#60756b] hover:bg-[#e6eee8] lg:hidden" onClick={() => setIsMobileNavOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button><span className="text-[13px] font-medium text-[#84958c]">Workspace</span><ChevronRight className="h-3.5 w-3.5 text-[#b4c1b9]" /><span className="text-[13px] font-semibold text-[#345b4e]">Overview</span></div>
          <div className="flex items-center gap-3"><button className="hidden rounded-lg p-2 text-[#84958c] hover:bg-[#e8f0e9] sm:block" onClick={() => toast.info("Help center is coming soon")} aria-label="Help"><CircleHelp className="h-[17px] w-[17px]" /></button><div className="h-7 w-px bg-[#dce7df]" /><button className="flex items-center gap-2 rounded-full pl-1 pr-2 hover:bg-[#e9f0ea]" onClick={() => user ? toast.info("Account settings are coming soon") : startLogin()}><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d3ead8] text-[11px] font-bold text-[#24664f]">{user?.name?.slice(0, 1).toUpperCase() || "F"}</div><span className="hidden text-[12px] font-semibold text-[#45665a] sm:block">{user?.name?.split(" ")[0] || "Guest"}</span></button></div>
        </header>

        <div className="mx-auto max-w-[1380px] px-5 py-7 sm:px-8 lg:px-11 lg:py-9">
          <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5c8b78]"><span className="h-1.5 w-1.5 rounded-full bg-[#5fa77f]" /> Live workspace</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.045em] text-[#173e34] sm:text-[37px]">Good morning{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1><p className="mt-1.5 text-[14px] text-[#718178]">Turn dense filings into clear financial signals.</p></div>
            <div className="flex items-center gap-2"><Button variant="outline" className="h-10 border-[#dce7df] bg-[#fbfdfb] px-3 text-[12px] font-semibold text-[#4b675d] hover:bg-[#edf4ee]" onClick={() => setLocation("/testing")}><ShieldCheck className="mr-2 h-3.5 w-3.5 text-[#5c8b78]" /> Test new features</Button><Button className="h-10 bg-[#10483f] px-4 text-[12px] font-bold text-white shadow-[0_5px_14px_rgba(16,72,63,.18)] hover:bg-[#0b3b34]" onClick={() => inputRef.current?.click()}><Plus className="mr-1.5 h-4 w-4" /> New analysis</Button></div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
            <Card className="paper-shadow overflow-hidden border-0 bg-white">
              <CardHeader className="flex flex-row items-start justify-between border-b border-[#edf1ed] px-6 pb-4 pt-5"><div><CardTitle className="font-display text-[16px] font-bold tracking-[-0.025em] text-[#244e42]">Upload a financial report</CardTitle><p className="mt-1 text-[12px] text-[#84938c]">PDF, DOCX, TXT, CSV, or Markdown · up to 20 MB</p></div><div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#e7f3e9] text-[#43846d]"><FileBarChart2 className="h-[18px] w-[18px]" /></div></CardHeader>
              <CardContent className="p-6">
                <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.csv,.md" onChange={(event) => { onPick(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                <div onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); onPick(event.dataTransfer.files?.[0]); }} className={`group flex min-h-[196px] cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed px-5 text-center transition-all ${isDragging ? "border-[#4b9c7d] bg-[#eef9ef]" : "border-[#cbdcd0] bg-[#f8fbf8] hover:border-[#76ae91] hover:bg-[#f2f9f3]"}`} onClick={() => !isReading && inputRef.current?.click()}>
                  {isReading ? <><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#dcefe0] text-[#34765c]"><Loader2 className="h-5 w-5 animate-spin" /></div><div className="text-[13px] font-bold text-[#315e4e]">Analyzing {selectedFile?.name}</div><p className="mt-1 text-[12px] text-[#81938a]">Extracting metrics, drivers, and risks…</p><div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-[#dfece1]"><div className="h-full w-2/3 animate-pulse-soft rounded-full bg-[#55a57c]" /></div></> : <><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#e5f2e8] text-[#34765c] transition-transform group-hover:-translate-y-1"><UploadCloud className="h-5 w-5" /></div><div className="text-[13px] font-bold text-[#315e4e]">Drop your report here, or <span className="text-[#2c8969] underline decoration-[#a8d7b6] underline-offset-2">browse files</span></div><p className="mt-1.5 text-[12px] text-[#87988f]">We’ll surface what matters in under a minute.</p><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a0aea5]"><ShieldCheck className="h-3 w-3 text-[#77a88e]" /> Private by default</div></>}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 bg-[#10483f] text-white shadow-[0_18px_42px_rgba(16,72,63,.18)]"><CardContent className="relative h-full min-h-[282px] p-6"><div className="absolute -right-14 -top-14 h-40 w-40 rounded-full border border-[#5ca183]/30" /><div className="absolute -right-2 top-4 h-32 w-32 rounded-full border border-[#5ca183]/20" /><div className="relative flex h-full flex-col"><div className="flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#2b6b5b] text-[#bcebc4]"><BarChart3 className="h-[17px] w-[17px]" /></div><Badge className="border-0 bg-[#286653] text-[10px] font-bold uppercase tracking-[0.08em] text-[#c6efd0]">Latest brief</Badge></div><div className="mt-7 text-[11px] font-bold uppercase tracking-[0.15em] text-[#9dc6ae]">Northstar Systems · Q2 FY26</div><div className="mt-2 font-display text-[22px] font-extrabold leading-[1.12] tracking-[-0.04em]">Growth is accelerating,<br />but cash conversion softened.</div><div className="mt-auto flex items-end justify-between pt-5"><div><div className="text-[11px] text-[#a4c7b5]">Analyst confidence</div><div className="mt-1.5 flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#356e5e]"><div className="h-full w-[88%] rounded-full bg-[#a1dcae]" /></div><span className="text-[12px] font-bold text-[#d0f0d5]">88%</span></div></div><Link href="/reports/1" className="flex items-center gap-1 text-[11px] font-bold text-[#caf2d2] hover:text-white">View brief <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></div></CardContent></Card>
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
            <Card className="overflow-hidden border-0 bg-white soft-shadow"><CardHeader className="flex flex-row items-center justify-between px-6 pb-3 pt-5"><div><CardTitle className="font-display text-[16px] font-bold tracking-[-0.025em] text-[#244e42]">Your recent reports</CardTitle><p className="mt-1 text-[12px] text-[#87968e]">A quick view of your latest analysis work.</p></div><Button variant="ghost" className="h-8 px-2 text-[11px] font-bold text-[#3b8068] hover:bg-[#eef7ef]" onClick={() => toast.info("All reports view is coming soon")}>View all <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></CardHeader><CardContent className="px-4 pb-3 pt-1">{reports.data && reports.data.length > 0 ? reports.data.slice(0, 4).map((report) => <Link key={report.id} href={`/reports/${report.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-[#f3f8f3]"><div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#e9f2eb] text-[11px] font-bold text-[#39735e]">{(report.company || report.fileName).slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-[#325a4d]">{report.company || report.fileName}</div><div className="mt-0.5 text-[11px] text-[#8a9991]">{report.period || "Processing"} · {report.fileName}</div></div><Badge className={`border-0 text-[10px] font-bold ${report.sentiment === "Positive" ? "bg-[#e0f3e3] text-[#36775b]" : report.sentiment === "Cautious" ? "bg-[#fff0d5] text-[#95691e]" : "bg-[#eceafa] text-[#655b98]"}`}>{report.sentiment || "Processing"}</Badge><div className="hidden w-20 text-right text-[10px] text-[#99a69e] sm:block">{report.createdAt ? new Date(report.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</div></Link>) : sampleReports.map((report) => <div key={report.company} className="flex items-center gap-3 rounded-xl px-2 py-3.5"><div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#e9f2eb] text-[11px] font-bold text-[#39735e]">{report.initials}</div><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-[#325a4d]">{report.company}</div><div className="mt-0.5 text-[11px] text-[#8a9991]">{report.period} · {report.type}</div></div><Badge className={`border-0 text-[10px] font-bold ${toneClass(report.tone)}`}>{report.tone === "positive" ? "Positive" : report.tone === "caution" ? "Cautious" : "Mixed"}</Badge><div className="hidden w-20 text-right text-[10px] text-[#99a69e] sm:block">{report.time}</div></div>)}</CardContent></Card>

            <Card className="border-0 bg-white soft-shadow"><CardHeader className="px-6 pb-3 pt-5"><div className="flex items-center justify-between"><div><CardTitle className="font-display text-[16px] font-bold tracking-[-0.025em] text-[#244e42]">Key signals</CardTitle><p className="mt-1 text-[12px] text-[#87968e]">From your latest brief</p></div><div className="rounded-lg bg-[#fff3d8] p-2 text-[#ad7a2a]"><Zap className="h-4 w-4" /></div></div></CardHeader><CardContent className="px-6 pb-5"><div className="space-y-4">{sampleMetrics.map((metric) => <div key={metric.label}><div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-[#73837b]">{metric.label}</span><span className={`font-bold ${metric.positive ? "text-[#398466]" : "text-[#b36657]"}`}>{metric.change}</span></div><div className="mt-1 flex items-baseline justify-between"><span className="font-display text-[20px] font-extrabold tracking-[-0.04em] text-[#234d40]">{metric.value}</span><div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#edf2ed]"><div className={`h-full rounded-full ${metric.positive ? "w-[76%] bg-[#67ad85]" : "w-[38%] bg-[#dc8c7c]"}`} /></div></div></div>)}</div><div className="mt-5 flex items-start gap-2 rounded-[10px] bg-[#f7f5eb] p-3 text-[11px] leading-[1.45] text-[#7d755d]"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#bf9f55]" /><span><strong className="font-bold text-[#75673f]">Watch:</strong> cash conversion is the only metric trending below plan.</span></div></CardContent></Card>
          </section>

          <section className="mt-8 rounded-[16px] border border-[#dbe8de] bg-[#eef7ef] px-5 py-4 sm:px-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#d5edd9] text-[#4a906c]"><Check className="h-4 w-4" /></div><div className="flex-1"><div className="text-[12px] font-bold text-[#3a6e59]">Your reports are private and secure</div><div className="mt-0.5 text-[11px] text-[#729180]">Files are encrypted at rest and only visible in your workspace.</div></div><button onClick={() => toast.info("Security documentation is coming soon")} className="flex items-center gap-1 text-[11px] font-bold text-[#3d8064] hover:underline">Learn about security <ArrowUpRight className="h-3 w-3" /></button></div></section>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#a0aea5]"><span>FinBrief AI · analyst workspace</span><span className="flex items-center gap-3"><span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> Not investment advice</span><span>v0.1</span></span></div>
        </div>
      </main>
    </div>
  );
}
