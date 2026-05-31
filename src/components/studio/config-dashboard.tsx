"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Sparkles,
  Sliders,
  Settings,
  CheckCircle,
  AlertTriangle,
  Play,
  Volume2,
  Save,
  ArrowLeft,
  Activity,
  SlidersHorizontal,
  RefreshCw,
  Image as ImageIcon
} from "lucide-react";
import { getChannelConfig, saveChannelConfig, type ChannelConfigData, generateHostCharacterSheet } from "@/app/actions/config-manager";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type ConfigTab = "architect" | "scriptwriter" | "visuals" | "settings";

export function ConfigDashboard() {
  const [config, setConfig] = useState<ChannelConfigData>({
    channelThesis: "",
    hostModelSheet: "",
    visualStylePrompt: "",
    scriptwriterSystem: "",
  });

  const [activeTab, setActiveTab] = useState<ConfigTab>("scriptwriter");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });

  const [characterSheetUrl, setCharacterSheetUrl] = useState<string>("/host-character-sheet.png");
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const [hasSheetError, setHasSheetError] = useState(false);

  async function handleGenerateCharacterSheet() {
    setGeneratingSheet(true);
    setSheetStatus({ type: null, msg: "" });
    setHasSheetError(false);
    try {
      const res = await generateHostCharacterSheet(config.hostModelSheet);
      if (res.ok && res.base64) {
        setCharacterSheetUrl(res.base64);
        setSheetStatus({ type: "success", msg: "Visual Character Sheet generated successfully!" });
        setTimeout(() => setSheetStatus({ type: null, msg: "" }), 5000);
      } else {
        setSheetStatus({ type: "error", msg: res.error ?? "Failed to generate visual character sheet turnaround." });
      }
    } catch (err) {
      setSheetStatus({ type: "error", msg: "An unexpected error occurred during generation." });
    } finally {
      setGeneratingSheet(false);
    }
  }

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getChannelConfig();
        setConfig(data);
      } catch (err) {
        console.error("Failed to load prompt configs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveStatus({ type: null, msg: "" });
    try {
      const res = await saveChannelConfig(config);
      if (res.ok) {
        setSaveStatus({ type: "success", msg: "Configuration successfully saved & compiled to disk!" });
        setTimeout(() => setSaveStatus({ type: null, msg: "" }), 4000);
      } else {
        setSaveStatus({ type: "error", msg: res.error ?? "Failed to save configuration." });
      }
    } catch (err) {
      setSaveStatus({ type: "error", msg: "An unexpected error occurred during compile." });
    } finally {
      setSaving(false);
    }
  }

  // Real-time Static Analysis of active prompt values
  const diagnostics = {
    visualDepth: config.visualStylePrompt.toLowerCase().includes("depth") || config.visualStylePrompt.toLowerCase().includes("environment-forward"),
    mugIsolated: !config.hostModelSheet.toLowerCase().includes("mug"),
    textBan: config.visualStylePrompt.toLowerCase().includes("zero text") || config.visualStylePrompt.toLowerCase().includes("typography"),
    shotRotation: config.scriptwriterSystem.toLowerCase().includes("rotate shot") || config.scriptwriterSystem.toLowerCase().includes("shot type"),
    descriptionMin: config.scriptwriterSystem.toLowerCase().includes("35 words") || config.scriptwriterSystem.toLowerCase().includes("minimum"),
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <Activity className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium tracking-wider">Loading Configuration Studio...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Top Navigation Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium tracking-[0.24em] text-primary uppercase">
            <Sliders className="size-3.5" />
            <span>Creator Studio</span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground mt-1.5 sm:text-3xl">
            Configuration & Prompt Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Tweak and compile system-level constants, visual anchors, narration parameters, and model sheets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/studio">
            <Button variant="outline" size="sm" className="inline-flex gap-1.5">
              <ArrowLeft className="size-4" />
              Command Center
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex gap-1.5 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
          >
            <Save className="size-4" />
            {saving ? "Compiling..." : "Save & Compile"}
          </Button>
        </div>
      </div>

      {saveStatus.type ? (
        <Alert
          variant={saveStatus.type === "error" ? "destructive" : "default"}
          className="mb-6"
        >
          {saveStatus.type === "success" ? (
            <CheckCircle aria-hidden />
          ) : (
            <AlertTriangle aria-hidden />
          )}
          <AlertTitle>
            {saveStatus.type === "success" ? "Compile Success" : "Compile Error"}
          </AlertTitle>
          <AlertDescription>{saveStatus.msg}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value: string | null) => {
          if (value) setActiveTab(value as ConfigTab);
        }}
        orientation="vertical"
        className="grid grid-cols-1 gap-8 lg:grid-cols-12"
      >
        
        {/* Left Side: Sidebar, Diagnostics & Previews Stack (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <TabsList
            variant="line"
            className="flex h-auto w-full flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.01] p-3 backdrop-blur-sm"
          >
            <TabsTrigger
              value="scriptwriter"
              className="w-full justify-start gap-3 px-4 py-3 data-active:border-primary/20 data-active:bg-white/[0.04] data-active:text-primary data-active:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
            >
              <FileText data-icon="inline-start" />
              Scriptwriter prompt
            </TabsTrigger>

            <TabsTrigger
              value="visuals"
              className="w-full justify-start gap-3 px-4 py-3 data-active:border-primary/20 data-active:bg-white/[0.04] data-active:text-primary data-active:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
            >
              <Sparkles data-icon="inline-start" />
              Visual Anchors
            </TabsTrigger>

            <TabsTrigger
              value="architect"
              className="w-full justify-start gap-3 px-4 py-3 data-active:border-primary/20 data-active:bg-white/[0.04] data-active:text-primary data-active:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
            >
              <BookOpen data-icon="inline-start" />
              Architect & Thesis
            </TabsTrigger>

            <TabsTrigger
              value="settings"
              className="w-full justify-start gap-3 px-4 py-3 data-active:border-primary/20 data-active:bg-white/[0.04] data-active:text-primary data-active:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
            >
              <Settings data-icon="inline-start" />
              Global Variables
            </TabsTrigger>
          </TabsList>

          {/* System Validation Report card */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-xl flex flex-col gap-4">
            <h4 className="font-heading text-sm font-bold text-foreground">Real-time Diagnostics</h4>
            
            <ul className="flex flex-col gap-3">
              <li className="flex items-start justify-between text-xs gap-3">
                <span className="text-muted-foreground font-medium">Visual Depth / Composition</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${diagnostics.visualDepth ? "text-emerald-400" : "text-amber-500"}`}>
                  {diagnostics.visualDepth ? (
                    <>
                      <CheckCircle className="size-3.5" /> High Depth
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5" /> Soft-Blur Flat
                    </>
                  )}
                </span>
              </li>

              <li className="flex items-start justify-between text-xs gap-3">
                <span className="text-muted-foreground font-medium">Character Mug Lock Isolation</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${diagnostics.mugIsolated ? "text-emerald-400" : "text-amber-500"}`}>
                  {diagnostics.mugIsolated ? (
                    <>
                      <CheckCircle className="size-3.5" /> Isolated
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5" /> Mug Gravity Well
                    </>
                  )}
                </span>
              </li>

              <li className="flex items-start justify-between text-xs gap-3">
                <span className="text-muted-foreground font-medium">Text and Typography Ban</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${diagnostics.textBan ? "text-emerald-400" : "text-amber-500"}`}>
                  {diagnostics.textBan ? (
                    <>
                      <CheckCircle className="size-3.5" /> TOTAL BAN
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5" /> Letters Allowed
                    </>
                  )}
                </span>
              </li>

              <li className="flex items-start justify-between text-xs gap-3">
                <span className="text-muted-foreground font-medium">Shot Type Rotation Law</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${diagnostics.shotRotation ? "text-emerald-400" : "text-amber-500"}`}>
                  {diagnostics.shotRotation ? (
                    <>
                      <CheckCircle className="size-3.5" /> Mandated
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5" /> Static Flat Frame
                    </>
                  )}
                </span>
              </li>

              <li className="flex items-start justify-between text-xs gap-3">
                <span className="text-muted-foreground font-medium">Visual Description Word Limits</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${diagnostics.descriptionMin ? "text-emerald-400" : "text-amber-500"}`}>
                  {diagnostics.descriptionMin ? (
                    <>
                      <CheckCircle className="size-3.5" /> Cinematic Detailed
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5" /> Short Generic
                    </>
                  )}
                </span>
              </li>
            </ul>
          </div>

          {/* Visual Preview / Character Turnaround Sheet Component */}
          {activeTab === "settings" ? (
            <div className="bg-card border border-border p-5 rounded-2xl shadow-xl flex flex-col gap-3">
              <h4 className="font-heading text-sm font-bold text-foreground">Visual Character Sheet</h4>
              
              <div className="relative aspect-video rounded-xl border border-white/10 bg-black/35 overflow-hidden group shadow-inner flex items-center justify-center">
                {hasSheetError ? (
                  <div className="flex flex-col items-center justify-center h-full w-full bg-black/40 text-muted-foreground p-4 text-center">
                    <ImageIcon className="size-8 text-white/20 mb-2" />
                    <span className="text-[10px] font-semibold text-white/60">No Turnaround Reference Found</span>
                    <span className="text-[9px] text-muted-foreground mt-1 leading-normal max-w-[220px]">
                      Create a visual turnaround reference matching your prose description.
                    </span>
                  </div>
                ) : (
                  <img 
                    src={characterSheetUrl} 
                    alt="Character model turnaround sheet" 
                    onError={() => setHasSheetError(true)}
                    className={`w-full h-full object-cover transition-all duration-500 ${generatingSheet ? "opacity-30 blur-sm" : "opacity-85 group-hover:scale-[1.02]"}`} 
                  />
                )}

                {generatingSheet && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="size-7 animate-spin text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-widest animate-pulse">Rendering Turnarounds...</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleGenerateCharacterSheet}
                  disabled={generatingSheet}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all shadow-inner"
                >
                  <RefreshCw className={`size-3.5 ${generatingSheet ? "animate-spin" : ""}`} />
                  {generatingSheet ? "Regenerating..." : "Regenerate Character Sheet"}
                </Button>

                {sheetStatus.type && (
                  <p className={`text-[10px] font-medium leading-tight ${sheetStatus.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                    {sheetStatus.msg}
                  </p>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground/90 leading-relaxed mt-1">
                Visual turnaround reference poses (front, side, 3/4) computed via Imagen 3. Used to anchor proportions and outfits across storyboard frames.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border p-5 rounded-2xl shadow-xl flex flex-col gap-3">
              <h4 className="font-heading text-sm font-bold text-foreground">16:9 Visual Preview</h4>
              <div className="relative aspect-video rounded-xl border border-white/10 bg-black/30 overflow-hidden group shadow-inner">
                <img 
                  src="/studio-dashboard-mockup.png" 
                  alt="Comic still preview" 
                  className="w-full h-full object-cover opacity-85 group-hover:scale-[1.02] transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                  <span className="text-[9px] font-semibold text-primary uppercase tracking-widest">Interactive Preview</span>
                  <p className="text-xs font-semibold text-white/95 mt-0.5 truncate">
                    Visualist Vector Panel — Green Hoodie & Sanctuary cat
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/90 leading-normal">
                Simulated Art Style output. Obeying art direction rules: Chibi-Lite scale, thick digital vector lines, clean solid navy & green hoodie values.
              </p>
            </div>
          )}

          {/* Narration Audio Wave Audition */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h4 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                <Volume2 className="size-4 text-primary" />
                <span>Narration Audio Audition</span>
              </h4>
              <button 
                onClick={() => {
                  setIsPlayingAudio(!isPlayingAudio);
                  if(!isPlayingAudio) {
                    setTimeout(() => setIsPlayingAudio(false), 5000);
                  }
                }}
                className="size-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                {isPlayingAudio ? (
                  <span className="flex gap-0.5 items-center">
                    <span className="w-0.5 h-3 bg-primary animate-pulse" />
                    <span className="w-0.5 h-2 bg-primary animate-pulse" />
                    <span className="w-0.5 h-3.5 bg-primary animate-pulse" />
                  </span>
                ) : (
                  <Play className="size-3.5 ml-0.5" />
                )}
              </button>
            </div>
            
            {/* Waveform Visualization */}
            <div className="h-14 bg-black/20 rounded-xl border border-white/5 p-2 flex items-center justify-center gap-0.5 overflow-hidden relative shadow-inner">
              {Array.from({ length: 48 }).map((_, i) => {
                const height = Math.sin(i * 0.3) * 16 + 22 + (isPlayingAudio ? Math.random() * 12 : 0);
                return (
                  <span
                    key={i}
                    style={{ height: `${Math.max(4, height)}px` }}
                    className={`w-[2.5px] rounded-full transition-all duration-300 ${
                      isPlayingAudio 
                        ? i % 14 === 0 
                          ? "bg-accent shadow-[0_0_6px_rgba(234,179,8,0.5)]"
                          : "bg-primary shadow-[0_0_6px_rgba(34,211,238,0.4)]"
                        : "bg-white/20"
                    }`}
                  />
                );
              })}
              
              <div className="absolute top-1 left-[28%] text-[8px] bg-accent/15 border border-accent/20 px-1 rounded-full text-accent scale-90">
                ... (Pause)
              </div>
              <div className="absolute top-1 right-[24%] text-[8px] bg-accent/15 border border-accent/20 px-1 rounded-full text-accent scale-90">
                — (Interrupt)
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/90 leading-relaxed">
              Checks spoken narration rhythm. Validates timing sync constraints, ellipses durations, and emphasis shifts on the page.
            </p>
          </div>
        </div>

        {/* Right Side: Oversized Prompt Editor Card (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-xl flex flex-col gap-4">
            
            <TabsContent value="scriptwriter">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">Lead Scriptwriter Instructions</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">Controls narration rhythm, acts structure, and visual directing constraints.</p>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider text-accent border border-accent/20 bg-accent/10 px-2.5 py-1 rounded-full uppercase">System Instruction</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground font-sans">Prompt System-Instruction Template</label>
                  <textarea
                    value={config.scriptwriterSystem}
                    onChange={(e) => setConfig({ ...config, scriptwriterSystem: e.target.value })}
                    rows={32}
                    className="w-full text-xs font-mono bg-black/35 text-foreground/95 p-4 rounded-xl border border-white/10 focus:outline-none focus:border-primary/50 scrollbar-studio resize-y leading-relaxed"
                  />
                </div>
            </TabsContent>

            <TabsContent value="visuals">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">Visual Style Language</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">Defines character models, storyboard hierarchies, recurring props, and text restrictions.</p>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider text-primary border border-primary/20 bg-primary/10 px-2.5 py-1 rounded-full uppercase">Imagen Style</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground font-sans">Visual Style Prompt Lines (One instruction per line)</label>
                  <textarea
                    value={config.visualStylePrompt}
                    onChange={(e) => setConfig({ ...config, visualStylePrompt: e.target.value })}
                    rows={32}
                    className="w-full text-xs font-mono bg-black/35 text-foreground/95 p-4 rounded-xl border border-white/10 focus:outline-none focus:border-primary/50 scrollbar-studio resize-y leading-relaxed"
                  />
                </div>
            </TabsContent>

            <TabsContent value="architect">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">Content Architect Thesis</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">The structural core thesis that aligns every script ideation and payload.</p>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider text-accent border border-accent/20 bg-accent/10 px-2.5 py-1 rounded-full uppercase">Core Thesis</span>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-muted-foreground font-sans">Active Channel Thesis</label>
                    <textarea
                      value={config.channelThesis}
                      onChange={(e) => setConfig({ ...config, channelThesis: e.target.value })}
                      rows={12}
                      className="w-full text-sm font-mono bg-black/35 text-foreground/95 p-4 rounded-xl border border-white/10 focus:outline-none focus:border-primary/50 resize-y leading-relaxed"
                    />
                  </div>
                </div>
            </TabsContent>

            <TabsContent value="settings">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">Host Continuity & Model Sheets</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">Enforces outfit lock, dimensions, colors, and features for visual generator matching.</p>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider text-primary border border-primary/20 bg-primary/10 px-2.5 py-1 rounded-full uppercase">Host Identity</span>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-muted-foreground font-sans">Character Outfit & Demeanor Locked Specification</label>
                    <textarea
                      value={config.hostModelSheet}
                      onChange={(e) => setConfig({ ...config, hostModelSheet: e.target.value })}
                      rows={32}
                      className="w-full text-xs font-mono bg-black/35 text-foreground/95 p-4 rounded-xl border border-white/10 focus:outline-none focus:border-primary/50 scrollbar-studio resize-y leading-relaxed"
                    />
                  </div>
                </div>
            </TabsContent>

          </div>
        </div>

      </Tabs>
    </div>
  );
}
