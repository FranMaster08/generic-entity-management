/**
 * @file in-memory.strategy.ts
 * Estrategia por defecto.
 *
 * - Rápida
 * - Simple
 * - Ideal para tests, prototipos, o apps sin persistencia.
 */

import type { EntityManagementStrategy } from "../types/strategy";
import type { Predicate, QueryOptions, PageResult } from "../types/query";
import { applyFunctionalFilters, paginate } from "../utils/query-utils";

/**
 * Implementación en memoria.
 * Mantiene un array interno de entidades.
 */
export class InMemoryEntityStrategy<T> implements EntityManagementStrategy<T> {
    private entities: T[] = [];

    async add(entity: T): Promise<void> {
        this.entities.push(entity);
    }

    async remove(
        entity: T,
        equalsFn: (a: T, b: T) => boolean = Object.is
    ): Promise<boolean> {
        const index = this.entities.findIndex(e => equalsFn(e, entity));
        if (index === -1) return false;

        this.entities.splice(index, 1);
        return true;
    }

    async getAll(): Promise<T[]> {
        // Copia defensiva
        return [...this.entities];
    }

    async update(
        oldEntity: T,
        newEntity: T,
        equalsFn: (a: T, b: T) => boolean = Object.is
    ): Promise<boolean> {
        const index = this.entities.findIndex(e => equalsFn(e, oldEntity));
        if (index === -1) return false;

        this.entities[index] = newEntity;
        return true;
    }

    async count(): Promise<number> {
        return this.entities.length;
    }

    async getOne(predicate: Predicate<T>): Promise<T | undefined> {
        return this.entities.find(predicate);
    }

    async find(options?: QueryOptions<T>): Promise<T[]> {
        return applyFunctionalFilters(this.entities, options);
    }

    async findPage(options: QueryOptions<T>): Promise<PageResult<T>> {
        const filtered = applyFunctionalFilters(this.entities, options);
        return paginate(filtered, options.page ?? 1, options.pageSize ?? 10);
    }

    async clear(): Promise<void> {
        this.entities = [];
    }
}