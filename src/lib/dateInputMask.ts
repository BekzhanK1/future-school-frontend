/**
 * Builds `dd.mm.yyyy hh:mm` from typed digits only (европейский порядок: день → месяц → год).
 * Удаление и backspace: берём только цифры из строки и заново накладываем маску.
 */
export function maskEuropeanDateTime(input: string): string {
    const digits = input.replace(/\D/g, '').slice(0, 12);
    if (!digits) return '';

    const dd = digits.slice(0, 2);
    if (digits.length <= 2) return dd;

    const mm = digits.slice(2, 4);
    if (digits.length <= 4) return `${dd}.${mm}`;

    const yyyy = digits.slice(4, 8);
    if (digits.length <= 8) return `${dd}.${mm}.${yyyy}`;

    const hh = digits.slice(8, 10);
    if (digits.length <= 10) return `${dd}.${mm}.${yyyy} ${hh}`;

    const min = digits.slice(10, 12);
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export function adjustMaskedCursor(oldVal: string, newVal: string, oldPos: number | null): number {
    if (oldPos == null) return newVal.length;
    const delta = newVal.length - oldVal.length;
    return Math.max(0, Math.min(newVal.length, oldPos + delta));
}
