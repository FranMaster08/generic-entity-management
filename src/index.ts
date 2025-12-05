/**
 * @file index.ts
 * Punto de entrada público de la librería.
 * Aquí exportas todo lo necesario para el consumidor.
 */

// Types
export * from "./types/query";
export * from "./types/strategy";

// Utils (opcional export público)
export * from "./utils/query-utils";

// Strategies
export * from "./strategies/in-memory.strategy";
export * from "./strategies/typeorm.strategy";
export * from "./strategies/sql.strategy";

// Manager
export * from "./management-entity";