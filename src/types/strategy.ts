/**
 * @file strategy.ts
 * Contrato unificado de estrategia.
 *
 * Decisión crítica:
 * El contrato es ASYNC para soportar de forma natural:
 * - Memoria (resuelve Promises inmediato)
 * - TypeORM
 * - SQL directo
 *
 * Así el ManagementEntity no cambia su API
 * cuando tú cambias la estrategia.
 */

import type { Predicate, QueryOptions, PageResult } from "./query";

/**
 * Estrategia genérica de gestión de entidades.
 *
 * Cada estrategia define cómo se almacenan y consultan los datos.
 * El Manager solo delega.
 */
export interface EntityManagementStrategy<T> {
    /** Agrega una entidad. */
    add(entity: T): Promise<void>;

    /**
     * Elimina una entidad.
     * equalsFn define igualdad lógica (por id, email, etc.)
     */
    remove(entity: T, equalsFn?: (a: T, b: T) => boolean): Promise<boolean>;

    /** Obtiene todas las entidades. */
    getAll(): Promise<T[]>;

    /**
     * Actualiza una entidad.
     * Busca oldEntity usando equalsFn y reemplaza por newEntity.
     */
    update(
        oldEntity: T,
        newEntity: T,
        equalsFn?: (a: T, b: T) => boolean
    ): Promise<boolean>;

    /** Cuenta entidades. */
    count(): Promise<number>;

    /**
     * Obtiene una entidad que cumpla el predicado.
     * En DB suele ser fallback en memoria.
     */
    getOne(predicate: Predicate<T>): Promise<T | undefined>;

    /**
     * Búsqueda avanzada opcional.
     * Si una estrategia no la implementa, el Manager hará fallback.
     */
    find?(options?: QueryOptions<T>): Promise<T[]>;

    /**
     * Búsqueda paginada opcional.
     * Si una estrategia no la implementa, el Manager hará fallback.
     */
    findPage?(options: QueryOptions<T>): Promise<PageResult<T>>;

    /** Limpia el storage si aplica. */
    clear?(): Promise<void>;
}