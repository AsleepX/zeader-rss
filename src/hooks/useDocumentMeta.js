import { useEffect } from 'react';

/**
 * Custom hook to dynamically update document meta tags for web clippers
 * This enables tools like Obsidian Clipper to capture the correct original article URL
 * and article metadata instead of the local reader URL
 */
export function useDocumentMeta(article, zymalData = null) {
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
    };
  }, [article, zymalData]);
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
