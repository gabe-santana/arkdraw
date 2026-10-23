/** Properties › Image: crop insets, reset, and back-to-natural-size for a single image shape. */
import { useState } from 'react';
import { ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine } from 'lucide-react';
import type { ImageCrop, ShapeElement } from '@/model/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { measureImage } from '@/app/commands';
import { cropToSides, rectForCrop, rectForNaturalSize, withCropSide, MAX_CROP_SIDE, type CropSide } from '@/lib/images';
import { NumberField } from '@/ui/controls';
import { Button } from '@/ui/Button';
import { Section, begin, end } from './sections';

/** Applies a crop, resizing the shape so the image keeps its on-canvas scale. */
function applyCrop(el: ShapeElement, crop: ImageCrop | undefined) {
  const rect = rectForCrop(el, el.crop, crop, { rotation: el.rotation, flipH: el.flipH, flipV: el.flipV });
  if (rect.w < 1 || rect.h < 1) return;
  useEditor.getState().updateElements({ [el.id]: { ...rect, crop } });
}

const SIDES: Array<{ side: CropSide; label: string; icon: React.ReactNode }> = [
  { side: 'top', label: 'Crop top', icon: <ArrowDownToLine /> },
  { side: 'right', label: 'Crop right', icon: <ArrowLeftToLine /> },
  { side: 'bottom', label: 'Crop bottom', icon: <ArrowUpToLine /> },
  { side: 'left', label: 'Crop left', icon: <ArrowRightToLine /> },
];

export function ImageSection({ el }: { el: ShapeElement }) {
  const [busy, setBusy] = useState(false);
  const sides = cropToSides(el.crop);
  // Reads the live element so scrubbing (many onChange calls) builds on the latest crop.
  const live = () => useEditor.getState().doc.elements[el.id] as ShapeElement | undefined;

  const originalSize = async () => {
    if (!el.icon) return;
    setBusy(true);
    const natural = await measureImage(el.icon);
    setBusy(false);
    const cur = live();
    if (!natural || !cur) {
      useUi.getState().toast("Couldn't read the image's size.", 'error');
      return;
    }
    useEditor.getState().updateElements({ [cur.id]: rectForNaturalSize(cur, natural, cur.crop) });
  };

  return (
    <Section title="Image">
      <div className="grid grid-cols-2 gap-1.5">
        {SIDES.map(({ side, label, icon }) => (
          <div key={side} title={label}>
            <NumberField
              label={icon}
              value={sides[side]}
              min={0}
              max={MAX_CROP_SIDE}
              precision={1}
              suffix="%"
              onScrubStart={begin}
              onCommit={end}
              onChange={(v) => {
                const cur = live();
                if (cur) applyCrop(cur, withCropSide(cur.crop, side, v));
              }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Button size="sm" disabled={!el.crop} onClick={() => applyCrop(el, undefined)}>
          Reset crop
        </Button>
        <Button size="sm" disabled={!el.icon || busy} onClick={() => void originalSize()}>
          Original size
        </Button>
      </div>
    </Section>
  );
}
