/**
 * 1 сентября учебного года по правилу:
 * до 1 июня (локально) — старт в прошлом сентябре (текущий ещё идущий уч. год);
 * с 1 июня — старт в сентябре текущего календарного года (новый уч. год).
 */
export function inferAcademicYearStartIso(now = new Date()): string {
    const y = now.getFullYear();
    const juneFirst = new Date(y, 5, 1);
    const startYear = now.getTime() < juneFirst.getTime() ? y - 1 : y;
    return `${startYear}-09-01`;
}
