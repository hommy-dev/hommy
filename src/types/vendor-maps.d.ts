// Minimal ambient declarations for the map libs (we only use a few functions).
// If you later run `pnpm add -D @types/d3-geo @types/topojson-client`, delete
// the d3-geo / topojson-client blocks below to use the real types.

declare module "d3-geo" {
  type Projection = ((coords: [number, number]) => [number, number] | null) & {
    fitSize(size: [number, number], object: unknown): Projection
  }
  export function geoAlbersUsa(): Projection
  export function geoPath(projection?: Projection): (object: unknown) => string | null
}

declare module "topojson-client" {
  export function feature(
    topology: unknown,
    object: unknown,
  ): { features: { type: string; geometry: unknown; properties: unknown }[] }
}

declare module "us-atlas/states-10m.json" {
  const value: { objects: { states: unknown; nation: unknown } } & Record<string, unknown>
  export default value
}
