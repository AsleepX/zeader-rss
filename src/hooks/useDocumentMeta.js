import { useEffect } from 'react';

/**
 * Custom hook to dynamically update document meta tags for web clippers
 * This enables tools like Obsidian Clipper to capture the correct original article URL
 * and article metadata instead of the local reader URL
 */
export function useDocumentMeta(article, zymalData = null, annotations = []) {
  useEffect(() => {
    if (!article) {
      // Reset to default when no article is selected
      document.title = 'Zeader';
      removeMetaTag('source');
      removeMetaTag('title');
      removeMetaTag('description');
      removeMetaTag('site');
      removeMetaTag('author');
      removeMetaTag('published');
      removeLinkTag('canonical');
      // Remove custom meta tags
      removeMetaTag('summary');
      removeMetaTag('tags');
      removeMetaTag('z-title');
      removeMetaTag('article-content');
      return;
    }

    // Update document title
    document.title = article.title ? `${article.title} - Zeader` : 'Zeader';

    // Set canonical URL to original article link - this is the most important for clippers
    if (article.link) {
      setLinkTag('canonical', article.link);
      setMetaTag('source', article.link);
    }

    // Set meta tags for better clipper support
    // Replace spaces with underscores in title for file naming
    setMetaTag('title', (article.title || '').replace(/\s+/g, '_'));
    setMetaTag('site', article.feedTitle || 'Zeader');

    // Set description from original feed content snippet
    const description = article.contentSnippet ? stripHtmlForMeta(article.contentSnippet).slice(0, 200) : '';
    setMetaTag('description', description);

    // Set article-specific meta tags
    if (article.author) {
      setMetaTag('author', article.author);
    }
    if (article.isoDate || article.pubDate) {
      setMetaTag('published', article.isoDate || article.pubDate);
    }

    // Custom meta tags for Z Summary data
    if (zymalData) {
      if (zymalData.Summary) {
        setMetaTag('summary', zymalData.Summary);
      }
      if (zymalData.Tags && Array.isArray(zymalData.Tags)) {
        setMetaTag('tags', zymalData.Tags.join(', '));
      }
      if (zymalData.Title) {
        setMetaTag('z-title', zymalData.Title);
      }
    }

    // Generate article-content meta tag with proper footnotes for Obsidian Clipper
    // This avoids the escaping issues when Clipper parses the DOM directly
    if (article.content || article.contentSnippet) {
      const contentEl = document.querySelector('.article-detail-content');
      if (contentEl) {
        let textContent = '';

        // Helper function to recursively extract text with formatting
        // parentIsHighlighted prevents nested == == when entire block is highlighted
        const extractTextWithFormatting = (node, parentIsHighlighted = false) => {
          // Handle text nodes
          if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
          }

          // Handle element nodes
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();

            // Handle hidden footnote reference markers (span with font-size: 0)
            if (tagName === 'span' && (node.classList.contains('zeader-annotation-marker') || node.style.fontSize === '0' || node.style.fontSize === '0px')) {
              // Extract the [^id] marker
              return node.textContent;
            }

            // Handle mark (highlight) tags - convert to == ==
            // Only add markers if parent is not already highlighted to avoid duplication
            if (tagName === 'mark' && node.classList.contains('zeader-highlight') && !parentIsHighlighted) {
              const innerText = Array.from(node.childNodes)
                .map(child => extractTextWithFormatting(child, true))
                .join('');

              // Check if innerText contains a footnote reference [^id] at the start or end
              // We want ==valid content==[^id], NOT ==[^id]valid content==
              const footnoteMatchEnd = innerText.match(/(\[\^\d+\])$/);
              const footnoteMatchStart = innerText.match(/^(\[\^\d+\])/);

              if (footnoteMatchEnd) {
                const marker = footnoteMatchEnd[1];
                const content = innerText.slice(0, -marker.length).trim();
                return `==${content}==${marker}`;
              } else if (footnoteMatchStart) {
                const marker = footnoteMatchStart[1];
                const content = innerText.slice(marker.length).trim();
                return `==${content}==${marker}`;
              } else {
                return `==${innerText}==`;
              }
            }

            // Handle images
            if (tagName === 'img') {
              const src = node.getAttribute('src');
              const alt = node.getAttribute('alt') || '';
              if (src) {
                return `![${alt}](${src})\n`;
              }
            }

            // For other elements, recursively process children
            return Array.from(node.childNodes)
              .map(child => extractTextWithFormatting(child, parentIsHighlighted))
              .join('');
          }

          return '';
        };

        // Extract text from each content block while preserving structure
        const blocks = contentEl.querySelectorAll('.mb-6');
        blocks.forEach(block => {
          // Skip the hidden footnotes section at the bottom
          const hiddenDiv = block.querySelector('div[style*="font-size: 0"][style*="line-height: 0"]');
          if (hiddenDiv) {
            return;
          }

          // Check if this block has block-level highlight (zeader-block-highlight class)
          const highlightedDiv = block.querySelector('.zeader-block-highlight');

          let text;
          if (highlightedDiv) {
            // For block-level highlights, extract inner text first
            const innerText = extractTextWithFormatting(highlightedDiv, true).trim();

            // Check if innerText ends with a footnote reference [^id]
            // We want ==valid content==[^id], NOT ==valid content [^id]==
            const footnoteMatch = innerText.match(/(\[\^\d+\])$/);

            if (footnoteMatch) {
              const marker = footnoteMatch[1];
              const content = innerText.slice(0, -marker.length).trim();
              text = `==${content}==${marker}`;
            } else {
              text = `==${innerText}==`;
            }
          } else {
            // For normal blocks, extract with potential inline highlights
            text = extractTextWithFormatting(block, false).trim();
          }

          if (text) {
            textContent += text + '\n\n';
          }
        });

        // Add footnotes at the end
        if (annotations && annotations.length > 0) {
          textContent += '\n\n';
          annotations.forEach(ann => {
            textContent += `[^${ann.id}]: ${ann.text}\n`;
          });
        }

        setMetaTag('article-content', textContent.trim());
      }
    }

    // Cleanup function to reset meta tags when unmounting
    return () => {
      document.title = 'Zeader';
      removeMetaTag('source');
      removeMetaTag('title');
      removeMetaTag('description');
      removeMetaTag('site');
      removeMetaTag('author');
      removeMetaTag('published');
      removeLinkTag('canonical');
      removeMetaTag('summary');
      removeMetaTag('tags');
      removeMetaTag('z-title');
      removeMetaTag('article-content');
    };
  }, [article, zymalData, annotations]);
}

// Helper function to set or update a meta tag
function setMetaTag(name, content) {
  if (!content) return;

  // Try to find existing meta tag
  let meta = document.querySelector(`meta[name="${name}"]`);

  if (!meta) {
    // Create new meta tag
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

// Helper function to remove a meta tag
function removeMetaTag(name) {
  const meta = document.querySelector(`meta[name="${name}"]`);
  if (meta) {
    meta.remove();
  }
}

// Helper function to set or update a link tag
function setLinkTag(rel, href) {
  if (!href) return;

  let link = document.querySelector(`link[rel="${rel}"]`);

  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }

  link.setAttribute('href', href);
}

// Helper function to remove a link tag
function removeLinkTag(rel) {
  const link = document.querySelector(`link[rel="${rel}"]`);
  if (link) {
    link.remove();
  }
}

// Helper to strip HTML tags for meta description
function stripHtmlForMeta(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
