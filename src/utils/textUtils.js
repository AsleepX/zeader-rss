/**
 * Injects a Markdown-style footnote marker into HTML content.
 * @param {string} html - The original HTML content.
 * @param {string} targetContent - The text content that was highlighted.
 * @param {string} id - The unique ID for the footnote (e.g., '1').
 * @returns {string} - The HTML with the injected marker.
 */
export function injectFootnoteMarker(html, targetContent, id) {
  // Simple injection: find the first occurrence of the target text and append the marker
  // Note: This is a basic implementation and might need refinement for complex HTML structures
  // or multiple occurrences.

  if (!html || !targetContent) return html;

  // Escape special characters in targetContent for regex
  const escapedTarget = targetContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTarget})`, 'i'); // Case-insensitive match, capture group to keep text

  // logic: 
  // We want to insert <sub class="visually-hidden">[^id]</sub> AFTER the match.
  // We use <sub> or <sup> but with a class to hide it.

  return html.replace(regex, `$1<sup class="visually-hidden">[^${id}]</sup>`);
}

/**
 * Creates the hidden footnote section logic.
 * This helper generates the HTML string for the footnotes section.
 * The user requested raw Markdown syntax: [^id]: text
 */
export function generateFootnotesSection(annotations) {
  if (!annotations || annotations.length === 0) return '';

  /*
   * Use font-size: 0 and color: transparent to hide while keeping in normal document flow.
   * This prevents Obsidian Clipper from escaping the Markdown syntax.
   */
  const textContent = annotations.map(
    (ann) => `[^${ann.id}]: ${ann.text}`
  ).join('<br>\n');

  return `
    <div style="font-size: 0; line-height: 0; color: transparent; user-select: none;">
      <br>
      ${textContent}
    </div>
  `;
}
