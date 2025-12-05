# ManagementEntity (Generic + Strategy Pattern)

Un gestor genérico de entidades en TypeScript que implementa **Strategy Pattern** para manejar almacenamiento y operaciones CRUD in-memory u otras estrategias personalizadas.

Si no se proporciona una estrategia, se utiliza **InMemoryEntityStrategy** por defecto.


## Características

- ✅ Genérico: funciona con cualquier `entity` (`ManagementEntity<T>`).
- ✅ **Strategy Pattern** para intercambiar almacenamiento sin cambiar el Manager.
- ✅ Estrategia por defecto: **en memoria**.
- ✅ `equalsFn` opcional para controlar cómo se comparan entidades (por `id`, por ejemplo).
- ✅ API simple y consistente.
- ✅ Fácil de extender (Map, LocalStorage, IndexedDB, API remota, etc.).


## Código base

Puedes copiar estos tres bloques en tus archivos o en uno solo si prefieres.

### 1) Contrato de estrategia

```ts
export interface EntityManagementStrategy<T> {
  add(entity: T): void;
  remove(entity: T, equalsFn?: (a: T, b: T) => boolean): boolean;
  getAll(): T[];
  update(oldEntity: T, newEntity: T, equalsFn?: (a: T, b: T) => boolean): boolean;
  count(): number;
  getOne(predicate: (entity: T) => boolean): T | undefined;
  clear?(): void;
}

2) Estrategia por defecto: InMemory

export class InMemoryEntityStrategy<T> implements EntityManagementStrategy<T> {
  private entities: T[] = [];

  add(entity: T): void {
    this.entities.push(entity);
  }

  remove(entity: T, equalsFn: (a: T, b: T) => boolean = Object.is): boolean {
    const index = this.entities.findIndex(e => equalsFn(e, entity));
    if (index === -1) return false;
    this.entities.splice(index, 1);
    return true;
  }

  getAll(): T[] {
    // Copia defensiva
    return [...this.entities];
  }

  update(
    oldEntity: T,
    newEntity: T,
    equalsFn: (a: T, b: T) => boolean = Object.is
  ): boolean {
    const index = this.entities.findIndex(e => equalsFn(e, oldEntity));
    if (index === -1) return false;
    this.entities[index] = newEntity;
    return true;
  }

  count(): number {
    return this.entities.length;
  }

  getOne(predicate: (entity: T) => boolean): T | undefined {
    return this.entities.find(predicate);
  }

  clear(): void {
    this.entities = [];
  }
}

3) Manager genérico

export class ManagementEntity<T> {
  private readonly strategy: EntityManagementStrategy<T>;
  private readonly equalsFn: (a: T, b: T) => boolean;

  constructor(options?: {
    strategy?: EntityManagementStrategy<T>;
    equalsFn?: (a: T, b: T) => boolean;
  }) {
    this.strategy = options?.strategy ?? new InMemoryEntityStrategy<T>();
    this.equalsFn = options?.equalsFn ?? Object.is;
  }

  addEntity(entity: T): void {
    this.strategy.add(entity);
  }

  removeEntity(entity: T): boolean {
    return this.strategy.remove(entity, this.equalsFn);
  }

  getAllEntities(): T[] {
    return this.strategy.getAll();
  }

  updateEntity(oldEntity: T, newEntity: T): boolean {
    return this.strategy.update(oldEntity, newEntity, this.equalsFn);
  }

  getEntityCount(): number {
    return this.strategy.count();
  }

  getOneEntity(predicate: (entity: T) => boolean): T | undefined {
    return this.strategy.getOne(predicate);
  }

  clearEntities(): void {
    this.strategy.clear?.();
  }
}



Uso

Uso básico (in-memory por defecto)

type User = { id: number; name: string };

const usersManager = new ManagementEntity<User>();

usersManager.addEntity({ id: 1, name: "Ana" });
usersManager.addEntity({ id: 2, name: "Luis" });

console.log(usersManager.getEntityCount()); // 2
console.log(usersManager.getAllEntities());

Comparación por id (recomendado para entidades reales)

type User = { id: number; name: string };

const usersManager = new ManagementEntity<User>({
  equalsFn: (a, b) => a.id === b.id,
});

usersManager.addEntity({ id: 1, name: "Ana" });

usersManager.updateEntity(
  { id: 1, name: "Ana" },
  { id: 1, name: "Ana María" }
);

console.log(usersManager.getOneEntity(u => u.id === 1));



Estrategia personalizada (ejemplo Map)

Si quieres otra forma de almacenamiento sin cambiar el manager:

export class MapEntityStrategy<T> implements EntityManagementStrategy<T> {
  private map = new Map<string, T>();

  constructor(private keyFn: (entity: T) => string) {}

  add(entity: T): void {
    this.map.set(this.keyFn(entity), entity);
  }

  remove(entity: T): boolean {
    return this.map.delete(this.keyFn(entity));
  }

  getAll(): T[] {
    return Array.from(this.map.values());
  }

  update(oldEntity: T, newEntity: T): boolean {
    const key = this.keyFn(oldEntity);
    if (!this.map.has(key)) return false;
    this.map.set(key, newEntity);
    return true;
  }

  count(): number {
    return this.map.size;
  }

  getOne(predicate: (entity: T) => boolean): T | undefined {
    for (const value of this.map.values()) {
      if (predicate(value)) return value;
    }
    return undefined;
  }

  clear(): void {
    this.map.clear();
  }
}

Uso:

type User = { id: number; name: string };

const manager = new ManagementEntity<User>({
  strategy: new MapEntityStrategy<User>(u => String(u.id)),
});



API

Método	Descripción	Retorno
addEntity(entity)	Agrega una entidad	void
removeEntity(entity)	Elimina una entidad usando equalsFn	boolean
getAllEntities()	Obtiene todas las entidades	T[]
updateEntity(old, new)	Reemplaza una entidad	boolean
getEntityCount()	Cuenta las entidades	number
getOneEntity(predicate)	Obtiene una entidad por condición	T | undefined
clearEntities()	Limpia usando estrategia si existe clear()	void


Buenas prácticas
	•	Define equalsFn cuando tus entidades tengan id o clave única.
	•	Mantén las estrategias pequeñas y enfocadas a almacenamiento/