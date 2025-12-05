/**
 * @file typeorm.strategy.ts
 * Estrategia para TypeORM.
 *
 * Objetivo:
 * Integrar un Repository<T> sin acoplar la librería a TypeORM runtime.
 *
 * Por eso:
 * - Tipamos repo con "shape typing" (duck typing).
 * - Esto evita que tu librería obligue a instalar TypeORM
 *   como dependencia directa si no quieres.
 *
 * Nota importante:
 * - predicate/filters/sortBy son funciones JS y NO son SQL-native.
 * - Se aplican como filtro post-consulta.
 */

import type { EntityManagementStrategy } from "../types/strategy";
import type { Predicate, PageResult, QueryOptions } from "../types/query";
import { applyFunctionalFilters } from "../utils/query-utils";

/**
 * Extiende QueryOptions con opciones típicas de TypeORM.
 * En tu app real puedes castear a los tipos oficiales:
 * FindOptionsWhere, FindOptionsOrder, FindOptionsRelations, etc.
 */
export interface TypeOrmQueryOptions<T> extends QueryOptions<T> {
    where?: any;
    order?: any;
    relations?: any;
    select?: any;
}

/**
 * "Shape" mínimo de un Repository de TypeORM.
 * Así tu librería no se acopla a imports directos.
 */
export interface TypeOrmRepositoryLike<T> {
    save: (entity: any) => Promise<any>;
    remove: (entity: any) => Promise<any>;
    find: (options?: any) => Promise<T[]>;
    count: (options?: any) => Promise<number>;
    findAndCount: (options?: any) => Promise<[T[], number]>;
    clear?: () => Promise<void>;
}

/**
 * Estrategia TypeORM genérica.
 */
export class TypeOrmEntityStrategy<T extends Record<string, any>>
    implements EntityManagementStrategy<T> {
    constructor(private readonly repo: TypeOrmRepositoryLike<T>) { }

    async add(entity: T): Promise<void> {
        await this.repo.save(entity);
    }

    async remove(
        entity: T,
        equalsFn: (a: T, b: T) => boolean = Object.is
    ): Promise<boolean> {
        try {
            // Camino ideal: entity con PK
            await this.repo.remove(entity);
            return true;
        } catch {
            // Fallback: localizar por equalsFn
            const all = await this.repo.find();
            const match = all.find(e => equalsFn(e, entity));
            if (!match) return false;

            await this.repo.remove(match);
            return true;
        }
    }

    async getAll(): Promise<T[]> {
        return this.repo.find();
    }

    async update(
        oldEntity: T,
        newEntity: T,
        equalsFn: (a: T, b: T) => boolean = Object.is
    ): Promise<boolean> {
        try {
            // Merge simple
            await this.repo.save({ ...(oldEntity as any), ...(newEntity as any) });
            return true;
        } catch {
            // Fallback: localizar por equalsFn
            const all = await this.repo.find();
            const match = all.find(e => equalsFn(e, oldEntity));
            if (!match) return false;

            await this.repo.save({ ...(match as any), ...(newEntity as any) });
            return true;
        }
    }

    async count(): Promise<number> {
        return this.repo.count();
    }

    /**
     * getOne funcional => fallback in-memory.
     */
    async getOne(predicate: Predicate<T>): Promise<T | undefined> {
        const all = await this.repo.find();
        return all.find(predicate);
    }

    /**
     * find:
     * - Si hay where/order/relations/select, consulta la DB.
     * - Luego aplica filtros funcionales si existen.
     */
    async find(options?: TypeOrmQueryOptions<T>): Promise<T[]> {
        const hasDbOptions =
            !!options?.where || !!options?.order || !!options?.relations || !!options?.select;

        const items = hasDbOptions
            ? await this.repo.find({
                where: options?.where,
                order: options?.order,
                relations: options?.relations,
                select: options?.select,
            })
            : await this.repo.find();

        return applyFunctionalFilters(items, options);
    }

    /**
     * findPage:
     * - Usa skip/take para paginar en DB.
     * - totalItems viene de la DB.
     * - Luego aplica filtros funcionales post-DB (si los hay).
     *
     * Nota:
     * Si usas predicate/filters funcionales aquí,
     * podrías terminar con menos items que pageSize en la página,
     * porque ocurren después del SQL.
     */
    async findPage(options: TypeOrmQueryOptions<T>): Promise<PageResult<T>> {
        const page = Math.max(1, options.page ?? 1);
        const pageSize = Math.max(1, options.pageSize ?? 10);

        const skip = (page - 1) * pageSize;
        const take = pageSize;

        const [itemsDb, totalDb] = await this.repo.findAndCount({
            where: options.where,
            order: options.order,
            relations: options.relations,
            select: options.select,
            skip,
            take,
        });

        const items = applyFunctionalFilters(itemsDb, options);

        const totalItems = totalDb;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePage = Math.min(page, totalPages);

        return {
            items,
            page: safePage,
            pageSize,
            totalItems,
            totalPages,
            hasNext: safePage < totalPages,
            hasPrev: safePage > 1,
        };
    }

    async clear(): Promise<void> {
        await this.repo.clear?.();
    }
}