/** True if string looks like an absolute http(s) URL */
function isProbablyHttpUrl(s: string): boolean {
    return /^https?:\/\//i.test(s.trim());
}

function safeDecodeURIComponent(s: string): string {
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

/**
 * Last path segment of a URL, without query string; safe for presigned S3 URLs.
 */
export function basenameFromStorageUrl(url: string): string {
    const withoutQuery = url.split('?')[0] ?? url;
    try {
        const u = new URL(withoutQuery);
        const seg = u.pathname.split('/').filter(Boolean).pop();
        if (seg) return safeDecodeURIComponent(seg);
    } catch {
        /* relative path */
    }
    const seg = withoutQuery.split('/').filter(Boolean).pop();
    return seg ? safeDecodeURIComponent(seg) : 'file';
}

/**
 * Human-readable file name for UI: never show full presigned URLs when a basename or title exists.
 */
export function getDisplayFileName(
    url: string,
    titleHint?: string | null
): string {
    const hint = titleHint?.trim();
    const base = basenameFromStorageUrl(url);

    if (hint && !isProbablyHttpUrl(hint)) {
        return hint;
    }
    if (hint && isProbablyHttpUrl(hint)) {
        return base;
    }
    return base || hint || 'file';
}
