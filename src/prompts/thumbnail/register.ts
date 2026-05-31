import { registerPrompt } from "@/prompts/registry";
import { buildThumbnailImagePrompt } from "@/prompts/thumbnail/build-imagen-prompt";

registerPrompt("THUMBNAIL_IMAGE_PROMPT", "v1.0", buildThumbnailImagePrompt);
