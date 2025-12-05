/**
 * @file sql.strategy.ts
 * Estrategia para SQL directo.
 *
 * Filosofía:
 * Tu librería NO debe imponer un driver específico.
 *
 * Por eso:
 * - Se define un adapter mínimo.
 * - Tú implementas ese adapter con:
 *   pg, mysql2, mssql, better-sqlite3, etc.
 *
 * Si el adapter provee select/selectPage SQL-native, genial.
 * Si no, el fallback usa selectAll + filtros funcionales.
 */

import type { EntityManagementStrategy } from "../types/strategy";
import type { Predicate, QueryOptions, PageResult } from "../types/query";
import { applyFunctionalFilters, paginate } from "../utils/query-utils";

/**
 * Adapter genérico para SQL.
 * Este es el contrato que implementas en tu app.
 */
export interface SqlAdapter<T> {
    insert(entity: T): Promise<void>;
    update(
        oldEntity: T,
        newEntity: T,
        equalsFn: (a: T, b: T) => boolean
    ): Promise<boolean>;
    delete(
        entity: T,
        equalsFn: (a: T, b: T) => boolean
    ): Promise<boolean>;

    selectAll(): Promise<T[]>;
    countAll(): Promise<number>;

    /**
     * Opcional:
     * Búsqueda SQL-native.
     * La forma en que interpretas QueryOptions queda a tu criterio
     * (o puedes definir opciones SQL propias en tu implementación).
     */
    select?(options?: QueryOptions<T>): Promise<T[]>;

    /**
     * Opcional:
     * Paginación SQL-native.
     * Debe retornar items + total.
     */
    selectPage?(options: QueryOptions<T>): Promise<{ items: T[]; total: number }>;

    clear?(): Promise<void>;
}

/**
 * Estrategia SQL genérica.
 */
export class SqlEntityStrategy<T> implements EntityManagementStrategy<T> {
    constructor(private readonly adapter: SqlAdapter<T>) { }

    async add(entity: T): Promise<void> {
        await this.adapter.insert(entity);
    }

    async remove(
        entity: T,
        equalsFn: (a: T, b: T) => boolean = Object.is
    ): Promise<boolean> {
        return this.adapter.delete(entity, equalsFn);
    }

    async getAll(): Promise<T[]> {
        return this.adapter.selectAll();
    }

    async update(
        oldEntity: T,
        newEntity: T,
        equalsFn: (a: T, b: T) => boolean = Object.is
    ): Promise<boolean> {
        return this.adapter.update(oldEntity, newEntity, equalsFn);
    }

    async count(): Promise<number> {
        return this.adapter.countAll();
    }

    async getOne(predicate: Predicate<T>): Promise<T | undefined> {
        const all = await this.adapter.selectAll();
        return all.find(predicate);
    }

    async find(options?: QueryOptions<T>): Promise<T[]> {
        // SQL-native si existe
        if (this.adapter.select) {
            const items = await this.adapter.select(options);
            return applyFunctionalFilters(items, options);
        }

        // Fallback in-memory
        const all = await this.adapter.selectAll();
        return applyFunctionalFilters(all, options);
    }

    async findPage(options: QueryOptions<T>): Promise<PageResult<T>> {
        const page = Math.max(1, options.page ?? 1);
        const pageSize = Math.max(1, options.pageSize ?? 10);

        // SQL-native si existe
        if (this.adapter.selectPage) {
            const { items, total } = await this.adapter.selectPage(options);

            // Filtros funcionales post-DB
            const filtered = applyFunctionalFilters(items, options);

            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const safePage = Math.min(page, totalPages);

            return {
                items: filtered,
                page: safePage,
                pageSize,
                totalItems: total,
                totalPages,
                hasNext: safePage < totalPages,
                hasPrev: safePage > 1,
            };
        }

        // Fallback in-memory
        const filtered = await this.find(options);
        return paginate(filtered, page, pageSize);
    }

    async clear(): Promise<void> {
        await this.adapter.clear?.();
    }
}