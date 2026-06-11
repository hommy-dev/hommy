-- ============================================================
-- 0006 — Coverage areas: circle (km) + arbitrary polygon, PostGIS matching
-- ============================================================
-- service_areas gains a shape model: `area_type` ('circle' | 'polygon'),
-- `radius_km` (replaces the deprecated `radius_miles`), and `polygon` (a JSON
-- ring of {lat,lng}). All shapes are projected into `geom` (PostGIS geography),
-- which lead matching tests with ST_Covers via a GiST index. A trigger keeps
-- `geom` in sync whenever the source fields change, so every write path
-- (onboarding, settings) gets correct matching for free.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint

ALTER TABLE "service_areas" ADD COLUMN "area_type" text DEFAULT 'circle' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_areas" ADD COLUMN "radius_km" double precision;--> statement-breakpoint
ALTER TABLE "service_areas" ADD COLUMN "polygon" jsonb;--> statement-breakpoint
ALTER TABLE "service_areas" ADD COLUMN "geom" geography(Geometry, 4326);--> statement-breakpoint

-- Backfill: convert existing miles → km (existing rows are all circles).
UPDATE "service_areas"
  SET "radius_km" = "radius_miles" * 1.609344
  WHERE "radius_km" IS NULL;--> statement-breakpoint

-- Backfill geom for existing circle rows.
UPDATE "service_areas"
  SET "geom" = ST_Buffer(
    ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography,
    "radius_km" * 1000.0
  )
  WHERE "geom" IS NULL
    AND "lat" IS NOT NULL
    AND "lng" IS NOT NULL
    AND "radius_km" IS NOT NULL;--> statement-breakpoint

CREATE INDEX "service_areas_geom_gist" ON "service_areas" USING gist ("geom");--> statement-breakpoint

-- Keep geom canonical on every write. For polygons, build a closed ring from
-- the JSON vertices; for circles, buffer the centre by the radius.
CREATE OR REPLACE FUNCTION public.service_areas_set_geom()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pts geometry[];
BEGIN
  IF NEW.area_type = 'polygon'
     AND NEW.polygon IS NOT NULL
     AND jsonb_array_length(NEW.polygon) >= 3 THEN
    SELECT array_agg(
             ST_SetSRID(
               ST_MakePoint((p->>'lng')::float8, (p->>'lat')::float8), 4326
             ) ORDER BY ord
           )
      INTO pts
      FROM jsonb_array_elements(NEW.polygon) WITH ORDINALITY AS e(p, ord);

    -- Close the ring if the last vertex doesn't repeat the first.
    IF NOT ST_Equals(pts[1], pts[array_length(pts, 1)]) THEN
      pts := pts || pts[1];
    END IF;

    NEW.geom := ST_MakePolygon(ST_MakeLine(pts))::geography;
  ELSIF NEW.lat IS NOT NULL
        AND NEW.lng IS NOT NULL
        AND NEW.radius_km IS NOT NULL THEN
    NEW.geom := ST_Buffer(
      ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography,
      NEW.radius_km * 1000.0
    );
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER service_areas_geom_trg
  BEFORE INSERT OR UPDATE OF area_type, lat, lng, radius_km, polygon
  ON "service_areas"
  FOR EACH ROW EXECUTE FUNCTION public.service_areas_set_geom();
