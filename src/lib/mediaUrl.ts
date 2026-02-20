/**
 * Convert backend-relative media URL to absolute URL (backend origin).
 * API is at e.g. http://localhost:8000/api, media is at http://localhost:8000/media/...
 */
export function getMediaUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string') return url ?? '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const origin = apiUrl.replace(/\/api\/?$/, '');
    return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}
