/** Four-act loop keys for Upgrade Life scripts. */
export type ScriptActId =
  | "mess"
  | "deep_dive"
  | "mirror"
  | "way_forward";

export type VisualBeat = {
  phrase: string;
  visualDescription: string;
};

/** One narration block: multiple rapid-fire visual beats trigger synchronized to narration. */
export type ScriptNarrationBlock = {
  narration: string;
  visualDescription?: string; // legacy support
  visualBeats: VisualBeat[]; // normalized array of visual beats
};

export type ScriptAct = {
  actId: ScriptActId;
  displayTitle: string;
  narrationBlocks: ScriptNarrationBlock[];
  curiosityBridge: string;
};

export type ScriptDocument = {
  workingTitle: string;
  acts: ScriptAct[];
};

export type GenerateScriptSuccess = {
  ok: true;
  script: ScriptDocument;
};

export type GenerateScriptFailure = {
  ok: false;
  error: string;
};

export type GenerateScriptResult = GenerateScriptSuccess | GenerateScriptFailure;
