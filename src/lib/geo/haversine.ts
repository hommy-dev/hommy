import { sql, type SQL } from 'drizzle-orm'

const EARTH_RADIUS_MILES = 3959

/**
 * Haversine distance in miles between a fixed point (lat, lng) and a target
 * row's lat/lng columns. Returns a Drizzle `sql` fragment that can be used
 * inside SELECT, WHERE, or ORDER BY clauses.
 *
 * The expression matches the formula previously inlined in
 * src/lib/matching/engine.ts so the matching engine and the contractor
 * discovery feed agree on distance to the byte.
 *
 * Both `latCol` and `lngCol` should be column references already wrapped in
 * a Drizzle `sql` fragment (e.g. `sql\`sa.lat\`` or `sql.identifier(...)`).
 */
export function haversineMilesSql(
  lat: number,
  lng: number,
  latCol: SQL,
  lngCol: SQL,
): SQL<number> {
  return sql<number>`${EARTH_RADIUS_MILES} * acos(
    LEAST(1.0, GREATEST(-1.0,
      cos(radians(${lat})) * cos(radians(${latCol}))
      * cos(radians(${lngCol}) - radians(${lng}))
      + sin(radians(${lat})) * sin(radians(${latCol}))
    ))
  )`
}
