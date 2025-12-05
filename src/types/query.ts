/**
 * @file query.ts
 * Tipos genéricos para filtros, ordenamiento y paginación.
 * Estos tipos son agnósticos a la fuente de datos:
 * - In-memory
 * - TypeORM
 * - SQL directo
 */

/**
 * Predicado funcional.
 * Útil para estrategias en memoria y como fallback en DB.
 *
 * IMPORTANTE:
 * Una función JS no se puede traducir automáticamente a SQL.
 * Por eso, en estrategias de DB se usa como filtro post-consulta
 * o se recomienda combinar con opciones nativas de base de datos.
 */
export type Predicate<T> = (entity: T) => boolean;

/**
 * Request de paginación estándar.
 * Notación 1-based para páginas.
 */
export interface PageRequest {
    page: number;      // 1-based
    pageSize: number;  // > 0
}

/**
 * Resultado de paginación con metadata para UI.
 */
export interface PageResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

/**
 * Opciones genéricas para búsquedas.
 *
 * - predicate: filtro principal
 * - filters: filtros adicionales (AND)
 * - sortBy: comparador funcional
 * - page/pageSize: paginación
 *
 * NOTA:
 * Estas opciones funcionan perfecto en memoria.
 * En DB pueden aplicarse como fallback en memoria.
 */
export interface QueryOptions<T> extends Partial<PageRequest> {
    predicate?: Predicate<T>;
    filters?: Predicate<T>[];
    sortBy?: (a: T, b: T) => number;
}