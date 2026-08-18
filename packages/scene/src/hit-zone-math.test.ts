import { describe, expect, it } from "vitest";
import {
  createGraphicsComponent,
  createHitZoneComponent,
  createSpriteComponent,
  defaultGraphicsShape,
  defaultHitZoneShapeFromVisual,
  applySizeToHitZoneShape,
  getHitZoneOffset,
  hitZoneLocalAabb,
  hitZoneSizeFromHandleDrag,
  insertHitZonePolygonPointOnEdge,
  isHitZoneEnabled,
  localPointHitsHitZone,
  removeHitZonePolygonPoint,
  setHitZonePolygonPoint,
} from "./index.js";

describe("hit-zone-math", () => {
  it("treats omitted enabled and offset as defaults", () => {
    const zone = createHitZoneComponent({
      shape: { type: "rectangle", width: 20, height: 10 },
    });
    expect(isHitZoneEnabled(zone)).toBe(true);
    expect(getHitZoneOffset(zone)).toEqual({ x: 0, y: 0 });
    expect(zone.enabled).toBeUndefined();
    expect(zone.offset).toBeUndefined();
  });

  it("hits a centered rectangle and misses outside", () => {
    const zone = createHitZoneComponent({
      shape: { type: "rectangle", width: 20, height: 10 },
    });
    expect(localPointHitsHitZone(zone, { x: 0, y: 0 })).toBe(true);
    expect(localPointHitsHitZone(zone, { x: 10, y: 5 })).toBe(true);
    expect(localPointHitsHitZone(zone, { x: 10.1, y: 0 })).toBe(false);
    expect(localPointHitsHitZone(zone, { x: 0, y: 5.1 })).toBe(false);
  });

  it("applies offset to rectangle hits and AABB", () => {
    const zone = createHitZoneComponent({
      offset: { x: 40, y: 10 },
      shape: { type: "rectangle", width: 20, height: 10 },
    });
    expect(localPointHitsHitZone(zone, { x: 40, y: 10 })).toBe(true);
    expect(localPointHitsHitZone(zone, { x: 0, y: 0 })).toBe(false);
    expect(hitZoneLocalAabb(zone)).toEqual({
      x: 30,
      y: 5,
      width: 20,
      height: 10,
    });
  });

  it("hits a circle by radius", () => {
    const zone = createHitZoneComponent({
      shape: { type: "circle", radius: 10 },
    });
    expect(localPointHitsHitZone(zone, { x: 0, y: 0 })).toBe(true);
    expect(localPointHitsHitZone(zone, { x: 6, y: 8 })).toBe(true);
    expect(localPointHitsHitZone(zone, { x: 6, y: 8.1 })).toBe(false);
  });

  it("hits an ellipse and misses the AABB corners", () => {
    const zone = createHitZoneComponent({
      shape: { type: "ellipse", width: 40, height: 20 },
    });
    expect(localPointHitsHitZone(zone, { x: 0, y: 0 })).toBe(true);
    expect(localPointHitsHitZone(zone, { x: 20, y: 0 })).toBe(true);
    expect(localPointHitsHitZone(zone, { x: 19, y: 9 })).toBe(false);
  });

  it("hits a triangle polygon with even-odd fill", () => {
    const zone = createHitZoneComponent({
      shape: defaultGraphicsShape("polygon"),
    });
    expect(localPointHitsHitZone(zone, { x: 0, y: 0 })).toBe(true);
    expect(localPointHitsHitZone(zone, { x: 0, y: -50 })).toBe(false);
  });

  it("ignores disabled hit zones", () => {
    const zone = createHitZoneComponent({
      enabled: false,
      shape: { type: "rectangle", width: 100, height: 100 },
    });
    expect(isHitZoneEnabled(zone)).toBe(false);
    expect(localPointHitsHitZone(zone, { x: 0, y: 0 })).toBe(false);
  });

  it("defaults shape from sprite size or graphics shape", () => {
    expect(
      defaultHitZoneShapeFromVisual(
        createSpriteComponent({ width: 128, height: 64 }),
      ),
    ).toEqual({ type: "rectangle", width: 128, height: 64 });
    const graphics = createGraphicsComponent({
      shape: { type: "circle", radius: 12 },
    });
    expect(defaultHitZoneShapeFromVisual(graphics)).toEqual({
      type: "circle",
      radius: 12,
    });
    expect(applySizeToHitZoneShape(
      { type: "circle", radius: 10 },
      30,
      20,
    )).toEqual({ type: "circle", radius: 15 });
  });

  it("keeps the opposite edge fixed when dragging a size handle", () => {
    const start = { x: 10, y: 20 };
    const east = hitZoneSizeFromHandleDrag("e", 80, 20, start, 100, 40);
    expect(east.width).toBe(120);
    expect(east.height).toBe(40);
    expect(east.offset).toEqual({ x: 20, y: 20 });

    const northWest = hitZoneSizeFromHandleDrag("nw", -50, -10, start, 100, 40);
    expect(northWest.width).toBe(110);
    expect(northWest.height).toBe(50);
    expect(northWest.offset).toEqual({ x: 5, y: 15 });
  });

  it("uniform corner drag keeps aspect from the opposite corner", () => {
    const grown = hitZoneSizeFromHandleDrag(
      "se",
      80,
      40,
      { x: 0, y: 0 },
      100,
      40,
      { uniform: true },
    );
    expect(grown.width).toBe(150);
    expect(grown.height).toBe(60);
    expect(grown.offset).toEqual({ x: 25, y: 10 });
  });

  it("edits polygon vertices and keeps at least three points", () => {
    const triangle = defaultGraphicsShape("polygon");
    const moved = setHitZonePolygonPoint(triangle, 0, { x: 4, y: -8 });
    expect(moved).toEqual({
      type: "polygon",
      points: [
        { x: 4, y: -8 },
        triangle.type === "polygon" ? triangle.points[1] : undefined,
        triangle.type === "polygon" ? triangle.points[2] : undefined,
      ],
    });

    const withPoint = insertHitZonePolygonPointOnEdge(triangle, 0, {
      x: 1,
      y: 2,
    });
    expect(withPoint.type).toBe("polygon");
    if (withPoint.type === "polygon") {
      expect(withPoint.points).toHaveLength(4);
      expect(withPoint.points[1]).toEqual({ x: 1, y: 2 });
    }

    expect(removeHitZonePolygonPoint(triangle, 0)).toEqual(triangle);
    const removed = removeHitZonePolygonPoint(withPoint, 1);
    expect(removed).toEqual(triangle);
  });
});
