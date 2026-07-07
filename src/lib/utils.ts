import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const ADMIN_EMAIL = 'nightruan31@gmail.com';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely encodes a string to Base64 (handles Unicode characters)
 */
export function encodeBase64(str: string): string {
  if (!str) return "";
  try {
    // We use a combination of encodeURIComponent and unescape to handle UTF-8 correctly
    // as btoa only supports Latin1.
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error("Base64 encoding error:", e);
    return str; // Fallback to raw string
  }
}

/**
 * Safely decodes a Base64 string back to its original UTF-8 representation
 */
export function decodeBase64(str: string): string {
  if (!str) return "";
  // If it's not base64 (e.g. legacy data), it might start with <html or <!DOCTYPE
  if (str.trim().startsWith('<')) return str;
  
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    // If decoding fails, return as is (might be legacy plain text)
    return str;
  }
}

/**
 * Robustly detects if a string contains HTML/Canvas content
 */
export const detectCanvasContent = (text: string): boolean => {
  if (!text || text.trim().length < 10) return false;
  
  const lower = text.toLowerCase().trim();
  
  // Direct markers
  const markers = [
    '<!doctype html>',
    '<html',
    '<script',
    '<body',
    '<!-- interactive canvas enabled -->',
    '<div id="app"',
    '<div id="root"',
    '<canvas',
    'window.onload',
    'document.addeventlistener',
    'react-root',
    'const app =',
    'new vue(',
    'defineelement',
    '<!doctype',
    '<html',
    '<head',
    '<script'
  ];
  
  if (markers.some(m => lower.includes(m))) return true;
  
  // Markdown code block with html hint
  if (lower.startsWith('```html')) return true;
  
  // Heuristic: multiple HTML tags
  const tags = ['<div', '<style', '<p', '<h1', '<h2', '<span', '<button', '<svg', '<input'];
  const tagMatchCount = tags.filter(t => lower.includes(t)).length;
  // If it has at least 3 distinct tags and at least one closing bracket
  if (tagMatchCount >= 3 && lower.includes('>')) return true;
  
  return false;
};

/**
 * Prepares HTML content for the iframe, stripping markdown and adding boilerplate if needed
 */
export const prepareHtmlForIframe = (raw: string) => {
  if (!raw) return "";
  let html = raw.trim();
  
  // Strip Markdown code blocks if current
  if (html.startsWith('```')) {
    const lines = html.split('\n');
    // Remove opening tag
    if (lines[0].startsWith('```')) lines.shift();
    // Remove closing tag
    if (lines[lines.length - 1].startsWith('```')) lines.pop();
    html = lines.join('\n').trim();
  }
  
  const lower = html.toLowerCase();
  
  // If it's already a full HTML document, return as is (maybe add tailwind if missing)
  if (lower.includes('<html')) {
    // Inject tailwind if likely needed but missing
    if (lower.includes('class=') && !lower.includes('tailwindcss.com') && !lower.includes('<style')) {
      if (lower.includes('<head>')) {
        return html.replace('<head>', '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script>');
      } else {
        return `<script src="https://cdn.tailwindcss.com"></script>${html}`;
      }
    }
    return html;
  }
  
  // Fragment wrapping - wrap in boilerplate to ensure rendering
  const hasBody = lower.includes('<body');
  const hasTailwind = lower.includes('class=');
  
  // Clean up any common artifacts that break srcDoc
  // Such as unescaped script tags if we were doing weird string concatenations (already handled by srcDoc usually)
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  ${hasTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  <style>
    :root { color-scheme: light; }
    html, body { height: 100%; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; 
      background-color: white;
      color: #1a1a1a;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    #root, #app { min-height: 100vh; position: relative; }
    .slide-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${hasBody ? html : `<div class="slide-container">${html}</div>`}
</body>
</html>`;
};
