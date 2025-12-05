/**
 * @file query-utils.ts
 * Utilidades internas para aplicar filtros funcionales
 * y construir objetos de paginación estándar.
 */

import type { QueryOptions, PageResult } from "../types/query";

/**
 * Aplica filtros funcionales:
 * - predicate
 * - filters[] combinados con AND
 * - sortBy
 */
export const applyFunctionalFilters = <T>(
    items: T[],
    options?: QueryOptions<T>
): T[] => {
    const predicate = options?.predicate;
    const filters = options?.filters ?? [];
    const sortBy = options?.sortBy;

    let filtered = items.filter(entity => {
        const mainOk = predicate ? predicate(entity) : true;
        if (!mainOk) return false;

        for (const f of filters) {
            if (!f(entity)) return false;
        }
        return true;
    });

    if (sortBy) filtered = [...filtered].sort(sortBy);

    return filtered;
};

/**
 * Genera un PageResult estándar.
 * Usa page 1-based.
 */
export const paginate = <T>(
    items: T[],
    page = 1,
    pageSize = 10
): PageResult<T> => {
    const safePage = Math.max(1, page);
    const safeSize = Math.max(1, pageSize);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
    const realPage = Math.min(safePage, totalPages);

    const start = (realPage - 1) * safeSize;
    const end = start + safeSize;

    return {
        items: items.slice(start, end),
        page: realPage,
        pageSize: safeSize,
        totalItems,
        totalPages,
        hasNext: realPage < totalPages,
        hasPrev: realPage > 1,
    };
};