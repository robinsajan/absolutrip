/**
 * Constructs a full, authenticated URL for an option's image.
 * Handles both local and Supabase proxy URLs, and appends the JWT token.
 */
export function getAuthenticatedImageUrl(urlOrPath: string, optionId?: number): string {
  if (!urlOrPath) return "";

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  let finalUrl = '';

  if (urlOrPath.startsWith('http')) {
    finalUrl = urlOrPath;
  } else {
    // Relative URL or Supabase path
    let path = urlOrPath;
    
    // If it looks like a Supabase path for options but lacks the proxy prefix
    if (optionId && !path.startsWith('/options/') && !path.startsWith('options/') && !path.startsWith('/api/') && !path.startsWith('/expenses/')) {
        path = `/options/${optionId}/images/${path}`;
    }

    // Clean up prefixes to avoid double API segments
    if (path.startsWith('/api/')) {
      path = path.substring(5);
    } else if (path.startsWith('api/')) {
      path = path.substring(4);
    } else if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    finalUrl = `${baseUrl}/${path}`;
  }

  if (finalUrl && token) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    return `${finalUrl}${separator}token=${token}`;
  }

  return finalUrl;
}

/**
 * Standardizes receipt URLs for display
 */
export function getReceiptUrl(urlOrPath: string): string {
    return getAuthenticatedImageUrl(urlOrPath);
}

/**
 * Helper to get all authenticated images for an option
 */
export function getOptionImages(option: { image_url?: string; image_path?: string; id?: number } | null): string[] {
  if (!option) return [];

  const urls = (option.image_url || "").split(",").map(u => u.trim()).filter(Boolean);
  const paths = (option.image_path || "").split(",").map(p => p.trim()).filter(Boolean);

  // If we have proxy URLs (image_url), they are better than raw paths
  if (urls.length > 0) {
    return urls.map(u => getAuthenticatedImageUrl(u, option.id));
  }

  // Fallback to paths
  return paths.map(p => getAuthenticatedImageUrl(p, option.id));
}
