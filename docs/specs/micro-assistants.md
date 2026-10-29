# Micro-assistants

Small helpers that finish what the user is obviously trying to do, inside the
gesture they are already making. Code lives in `src/assistants/`.

## Rules every micro-assistant follows

1. **No UI of its own.** No dialog, toast, button or setting to discover. It acts
   during a normal gesture (drag, resize, drop) and its only trace is the result.
2. **Shown before it is applied.** While the gesture is in progress the user sees
   what will happen (a guide line, a preview point, the connector itself). Letting
   go is the confirmation.
3. **Easy to refuse.** Moving a little further past the pull releases it, and
   holding **Alt** turns every assistant off for that gesture (as it does snapping).
4. **One undo step.** The assistant's change is part of the gesture's own undo step.
5. **Conservative.** It acts only within a few screen pixels of the result, so it
   never fights a deliberate placement.

## Straight connectors (`straighten.ts`)

When a shape is moved or resized and one of its connectors is within
`STRAIGHTEN_SNAP` (8) screen pixels of running straight, the shape (or the
dragged edge) is pulled the rest of the way and a guide line is drawn along the
connector. It takes priority over the other snaps on that axis, including the
grid, which is what used to keep the connector from ever lining up.

- Applies to connectors with one end on the moving shape and the other end
  fixed, without waypoints, not curved.
- A level line is pulled only when both ends leave sideways (left/right or
  floating); a vertical line only when both leave up or down.
- Resizing moves the dragged edge by the jog divided by how fast the end follows
  that edge (½ for a side midpoint), so the end lands exactly level.

## Connection point made to measure (`connectionPoint.ts`)

When a connector end is dropped on a shape, in this order:

1. An existing connection point near the drop (`POINT_SNAP`, 18 px) is used,
   unless a straight position is within `STRAIGHT_PREFERENCE` (24 px) of it; then
   the straight position wins, so the connector has no small jog.
2. If the other end faces a side of the shape (rectangular outlines), a point is
   made level with it on that side: the connector runs straight.
3. Otherwise, a drop within `OUTLINE_REACH` (14 px) of the outline makes a point
   right there.
4. Otherwise the end floats and the connector picks the side, as before.

A point made this way is stored like any fixed connection point (a fraction of
the shape's box), so it keeps its place as the shape moves and resizes. While
dragging, a ring marks where the new point will be; Shift still forces the exact
outline point under the pointer.
