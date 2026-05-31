import { registerPrompt } from "@/prompts/registry";
import {
  ACT_WRITER_SYSTEM,
  CONSULTANT_AUDIT_SYSTEM,
  OUTLINE_WRITER_SYSTEM,
} from "@/prompts/script-writer/build-system-instruction";

registerPrompt("OUTLINE_WRITER_SYSTEM", "v1.0", () => OUTLINE_WRITER_SYSTEM);
registerPrompt("ACT_WRITER_SYSTEM", "v1.0", () => ACT_WRITER_SYSTEM);
registerPrompt("CONSULTANT_AUDIT_SYSTEM", "v1.0", () => CONSULTANT_AUDIT_SYSTEM);
