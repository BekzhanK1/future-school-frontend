/** Light extension check for showing inline <img> previews (URLs may include query strings). */
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|#|$)/i;

export function isProbablyImageUrl(url: string | null | undefined): boolean {
    if (!url?.trim()) return false;
    return IMAGE_EXT_RE.test(url);
}
