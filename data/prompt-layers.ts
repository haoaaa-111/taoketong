export interface PromptLayer {
  name: string;           // XML tag name: "course-meta"
  content?: string;       // Layer content (Markdown format)
  condition?: boolean;    // true = inject, false = skip
  systemNote?: string;    // Optional: tell LLM about this block's nature
}

/**
 * Build user prompt from ordered layers.
 * Output: <layer1>...</layer1>\n\n---\n\n<layer2>...</layer2> ...
 */
export function buildUserPrompt(layers: PromptLayer[]): string {
  const blocks: string[] = [];
  for (const layer of layers) {
    if (layer.condition === false) continue;
    if (!layer.content && !layer.systemNote) continue;
    const lines: string[] = [];
    lines.push(`<${layer.name}>`);
    if (layer.systemNote) {
      lines.push(`[System note: ${layer.systemNote}]`);
      lines.push('');
    }
    if (layer.content) lines.push(layer.content);
    lines.push(`</${layer.name}>`);
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n---\n\n');
}
