/** Short label for a topics block (batch headers, previews). */
export function topicsPreview(topics: string, maxLen = 140): string {
  const t = topics.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}
