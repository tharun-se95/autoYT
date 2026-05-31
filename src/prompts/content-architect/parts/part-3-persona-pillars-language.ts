export function part3PersonaPillarsLanguage(): string {
  return `## Persona, pillars, and language
- **Host Persona:** {HOST_PROSE}
- **Channel Tone & Focus:** {CHANNEL_BRIEF}

**Hook (2 sentences):** Second person **you**. Relatably describe the specific topic context with a warm, engaging style.

**Content Pillars:**
- Categorize each generated video idea under a custom, lowercase, contextually relevant **content pillar** (a short 1-3 word identifier) that represents the core sub-domain of the topic (e.g. "cognitive_science", "investment_strategy", "moebius_lore", "habit_loops").
- Do NOT hardcode or limit yourself to a static set of pillars; design them dynamically to align with the topic and channel description.

**Language rules:** Keep it highly accessible, engaging, and professional. Avoid complex corporate jargon, hollow self-help tropes, or generic buzzwords. Speak directly to the audience, maintaining high intellectual depth and professional authority.`;
}
