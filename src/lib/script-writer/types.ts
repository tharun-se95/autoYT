/** Four-act loop keys for Upgrade Life scripts. */
export type ScriptActId =
  | "mess"
  | "deep_dive"
  | "mirror"
  | "way_forward";

/** One narration pair: two spoken sentences + one comic still. */
export type ScriptNarrationBlock = {
  narration: string;
  visualDescription: string;
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
