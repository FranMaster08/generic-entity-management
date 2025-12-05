/**
 * @file management-entity.ts
 * Clase principal expuesta al consumidor de la librería.
 *
 * Esta clase:
 * - No sabe dónde viven los datos.
 * - Solo delega en la estrategia.
 * - Tiene fallback si faltan find/findPage.
 */

import type { EntityManagementStrategy } from "./types/strategy";
import type { Predicate, QueryOptions, PageResult } from "./types/query";
import { applyFunctionalFilters, paginate } from "./utils/query-utils";
import { InMemoryEntityStrategy } from "./strategies/in-memory.strategy";

/**
 * Manager genérico.
 * Default: InMemoryEntityStrategy.
 */
export class ManagementEntity<T> {
    private readonly strategy: EntityManagementStrategy<T>;
    private readonly equalsFn: (a: T, b: T) => boolean;

    constructor(options?: {
        /**
         * Estrategia custom.
         * Si no la pasas, el manager usa memoria.
         */
        strategy?: EntityManagementStrategy<T>;

        /**
         * Igualdad lógica de entidad.
         * Útil para update/remove en memoria y fallbacks en DB.
         */
        equalsFn?: (a: T, b: T) => boolean;
    }) {
        this.strategy = options?.strategy ?? new InMemoryEntityStrategy<T>();
        this.equalsFn = options?.equalsFn ?? Object.is;
    }

    /** Agregar entidad. */
    public async addEntity(entity: T): Promise<void> {
        await this.strategy.add(entity);
    }

    /** Eliminar entidad usando equalsFn. */
    public async removeEntity(entity: T): Promise<boolean> {
        return this.strategy.remove(entity, this.equalsFn);
    }

    /** Trae todas las entidades. */
    public async getAllEntities(): Promise<T[]> {
        return this.strategy.getAll();
    }

    /** Actualiza entidad buscándola vía equalsFn. */
    public async updateEntity(oldEntity: T, newEntity: T): Promise<boolean> {
        return this.strategy.update(oldEntity, newEntity, this.equalsFn);
    }

    /** Cuenta entidades. */
    public async getEntityCount(): Promise<number> {
        return this.strategy.count();
    }

    /** Obtiene una entidad por predicado. */
    public async getOneEntity(predicate: Predicate<T>): Promise<T | undefined> {
        return this.strategy.getOne(predicate);
    }

    /**
     * Búsqueda con filtros/orden.
     * Si la estrategia lo soporta, delega.
     * Si no, hace fallback usando getAll.
     */
    public async findEntities(options?: QueryOptions<T>): Promise<T[]> {
        if (this.strategy.find) {
            return this.strategy.find(options);
        }

        const all = await this.strategy.getAll();
        return applyFunctionalFilters(all, options);
    }

    /**
     * Búsqueda paginada.
     * Si la estrategia lo soporta, delega.
     * Si no, hace fallback con findEntities + paginate.
     */
    public async findEntitiesPage(options: QueryOptions<T>): Promise<PageResult<T>> {
        if (this.strategy.findPage) {
            return this.strategy.findPage(options);
        }

        const filtered = await this.findEntities(options);
        return paginate(filtered, options.page ?? 1, options.pageSize ?? 10);
    }

    /** Limpia el storage si la estrategia lo soporta. */
    public async clearEntities(): Promise<void> {
        await this.strategy.clear?.();
    }
}