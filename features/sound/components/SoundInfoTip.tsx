'use client';

import { InfoTip } from '@/components/ui/InfoTip';

/**
 * The one explanation of the click-sound preference, shared by the profile
 * dropdown, the mobile drawer and Settings. Keeping the copy here means the
 * three surfaces cannot drift, and no surface needs a visible paragraph
 * explaining a single switch.
 */
const SOUND_TIP_SHORT =
  'A short touchpad click on buttons, toggles, tabs, dialogs and dropdowns.';

const SOUND_TIP_DETAILS = [
  'Plays “Laptop Touchpad Click” by Lesiakower (Pixabay): one short, subtle click for buttons, toggles, tabs, segmented controls, dialogs and dropdowns.',
  'It never plays on hover, while scrolling, while typing, on page load, or on links that navigate away.',
  'The setting is stored on this device only. Turning it off silences every click in the app.',
  'Sound is independent of reduced motion: reducing animations does not silence the click, and turning sound off does not change any animation.',
];

export function SoundInfoTip({ className = '' }: { className?: string }) {
  return (
    <InfoTip
      title="Click sounds"
      short={SOUND_TIP_SHORT}
      details={SOUND_TIP_DETAILS}
      label="About click sounds"
      className={className}
    />
  );
}

export default SoundInfoTip;
