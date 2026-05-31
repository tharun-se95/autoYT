"use server";

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { generateImagenSinglePng } from "@/lib/thumbnail/imagen-single-png";

const WORKSPACE_ROOT = process.cwd();

function writeFileSyncAtomic(targetPath: string, content: string | Buffer) {
  const tmpPath = `${targetPath}.${crypto.randomUUID()}.tmp`;
  if (typeof content === "string") {
    fs.writeFileSync(tmpPath, content, "utf8");
  } else {
    fs.writeFileSync(tmpPath, content);
  }
  fs.renameSync(tmpPath, targetPath);
}

const PATHS = {
  channelDna: path.join(WORKSPACE_ROOT, "src/lib/channel-dna.ts"),
  hostModelSheet: path.join(WORKSPACE_ROOT, "src/prompts/shared/host-model-sheet.ts"),
  channelVisualStyle: path.join(WORKSPACE_ROOT, "src/lib/channel-visual-style.ts"),
  scriptwriterSystem: path.join(WORKSPACE_ROOT, "src/prompts/script-writer/build-system-instruction.ts"),
  characterSheet: path.join(WORKSPACE_ROOT, "public/host-character-sheet.png"),
};

export interface ChannelConfigData {
  channelThesis: string;
  hostModelSheet: string;
  visualStylePrompt: string;
  scriptwriterSystem: string;
}

export async function getChannelConfig(): Promise<ChannelConfigData> {
  try {
    // 1. Read Channel Thesis
    const dnaContent = fs.readFileSync(PATHS.channelDna, "utf-8");
    const thesisMatch = dnaContent.match(/export const CHANNEL_THESIS\s*=\s*([\s\S]*?);/);
    let channelThesis = "";
    if (thesisMatch) {
      const rawStr = thesisMatch[1].trim();
      // Remove enclosing quotes (double, single, or backtick)
      channelThesis = rawStr.slice(1, -1);
    }

    // 2. Read Host Model Sheet
    const modelContent = fs.readFileSync(PATHS.hostModelSheet, "utf-8");
    const modelMatch = modelContent.match(/export const HOST_MODEL_SHEET_PROSE\s*=\s*([\s\S]*?);/);
    let hostModelSheet = "";
    if (modelMatch) {
      const rawStr = modelMatch[1].trim();
      hostModelSheet = rawStr.slice(1, -1);
    }

    // 3. Read Visual Style Prompt
    const visualContent = fs.readFileSync(PATHS.channelVisualStyle, "utf-8");
    const arrayMatch = visualContent.match(/export const CHANNEL_VISUAL_STYLE_PROMPT = \[\s*([\s\S]*?)\s*\]\.join\(['"]\\\\?n['"]\);/);
    let visualStylePrompt = "";
    if (arrayMatch) {
      const arrayBody = arrayMatch[1];
      // Extract all strings in array format
      const regex = /"([\s\S]*?)"|'([\s\S]*?)'/g;
      let match;
      const lines: string[] = [];
      while ((match = regex.exec(arrayBody)) !== null) {
        lines.push(match[1] || match[2]);
      }
      visualStylePrompt = lines.join("\n");
    }

    // 4. Read Scriptwriter System Instruction
    const scriptContent = fs.readFileSync(PATHS.scriptwriterSystem, "utf-8");
    const scriptMatch = scriptContent.match(/export const ACT_WRITER_SYSTEM\s*=\s*`([\s\S]*?)`;/);
    let scriptwriterSystem = "";
    if (scriptMatch) {
      scriptwriterSystem = scriptMatch[1];
    }

    return {
      channelThesis,
      hostModelSheet,
      visualStylePrompt,
      scriptwriterSystem,
    };
  } catch (err) {
    console.error("Error reading channel config:", err);
    throw new Error("Failed to read active channel prompt configurations.");
  }
}

export async function saveChannelConfig(data: ChannelConfigData): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Write Channel Thesis
    let dnaContent = fs.readFileSync(PATHS.channelDna, "utf-8");
    const newThesisValue = `export const CHANNEL_THESIS =\n  "${data.channelThesis.replace(/"/g, '\\"')}";`;
    dnaContent = dnaContent.replace(/export const CHANNEL_THESIS\s*=\s*[\s\S]*?;/, newThesisValue);
    writeFileSyncAtomic(PATHS.channelDna, dnaContent);

    // 2. Write Host Model Sheet
    let modelContent = fs.readFileSync(PATHS.hostModelSheet, "utf-8");
    const newModelValue = `export const HOST_MODEL_SHEET_PROSE =\n  "${data.hostModelSheet.replace(/"/g, '\\"')}";`;
    modelContent = modelContent.replace(/export const HOST_MODEL_SHEET_PROSE\s*=\s*[\s\S]*?;/, newModelValue);
    writeFileSyncAtomic(PATHS.hostModelSheet, modelContent);

    // 3. Write Visual Style Prompt
    const lines = data.visualStylePrompt.split("\n").map(line => `  ${JSON.stringify(line)}`);
    const newVisualStyleContent = `/**
 * Canonical **Visualist / Chibi-Lite narrative explainer comic** language for Upgrade Life:
 * thumbnails (Imagen) and per-block **[VIS]** 16:9 stills from the script agent.
 * Keep in sync with \`Upgrade_Life_Final_DNA_v4.txt\` (section 4 — visual language).
 */
export const CHANNEL_VISUAL_STYLE_PROMPT = [
${lines.join(",\n")}
].join("\\n");
`;
    writeFileSyncAtomic(PATHS.channelVisualStyle, newVisualStyleContent);

    // 4. Write Scriptwriter System Instruction
    let scriptContent = fs.readFileSync(PATHS.scriptwriterSystem, "utf-8");
    // Ensure we escape backticks or backslashes if any in incoming text (or handle robust template string placement)
    const escapedSystemInstruction = data.scriptwriterSystem.replace(/`/g, "\\`").replace(/\${/g, "\\${");
    
    // We want to replace only the constant string block
    scriptContent = scriptContent.replace(/export const ACT_WRITER_SYSTEM\s*=\s*`[\s\S]*?`;/, `export const ACT_WRITER_SYSTEM = \`${escapedSystemInstruction}\`;`);
    writeFileSyncAtomic(PATHS.scriptwriterSystem, scriptContent);

    return { ok: true };
  } catch (err) {
    console.error("Error writing channel config:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to write prompt configurations." };
  }
}

export async function generateHostCharacterSheet(customProse: string): Promise<{ ok: boolean; base64?: string; error?: string }> {
  try {
    const prompt = [
      `Model sheet illustration, character turnaround sheet showing 3 separate full-body poses side-by-side: side view, front view, and 3/4 dynamic pose.`,
      `Character is: ${customProse.trim()}`,
      `Set against a clean, plain, neutral light gray studio background. Professional character concept sheet, turnaround visual reference, clean thick digital vector lines, vibrant colors, Chibi-Lite proportions.`,
      `Strictly no text, labels, annotations, or watermarks.`
    ].join(" ");

    const gen = await generateImagenSinglePng(prompt);
    if (!gen.ok) {
      return { ok: false, error: gen.error };
    }

    // Save to public/host-character-sheet.png
    const buffer = Buffer.from(gen.base64, "base64");
    writeFileSyncAtomic(PATHS.characterSheet, buffer);

    return { ok: true, base64: `data:${gen.mimeType};base64,${gen.base64}` };
  } catch (err) {
    console.error("Error generating character sheet:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to generate character model sheet turnarounds." };
  }
}
