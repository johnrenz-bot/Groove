import {
  CalendarCheck,
  Clock3,
  Images,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * The two registration paths, in one place.
 *
 * Everything the role cards need — image, copy, destination, crop position and
 * blur placeholder — lives here, so swapping a photo means changing one `image`
 * string and nothing else.
 */

export type RegistrationRoleId = 'coach' | 'client';

export interface RolePerk {
  id: string;
  label: string;
  detail: string;
  icon: LucideIcon;
}

export interface RegistrationRole {
  id: RegistrationRoleId;
  chip: string;
  title: string;
  tagline: string;
  description: string;
  href: string;
  image: string;
  imageAlt: string;
  /** CSS object-position at >= 640px. Tuned so the face clears the scrim. */
  imagePosition: string;
  /** CSS object-position on the short mobile card. */
  imagePositionMobile: string;
  /** 16x20 WebP data URL generated from the file above. */
  blurDataURL: string;
  perks: RolePerk[];
}

/* Generated with sharp from public/image/login/choreo.jpg. */
const CHOREO_BLUR =
  'data:image/webp;base64,UklGRrgAAABXRUJQVlA4IKwAAABwBACdASoQABQAPt1apkyopSOiMAgBEBuJQBOmUAS3AnMD1zhXmzmEtnavgAD+X2sAka3h01xdOCLZkv+sMgVa2Nm3/z3esrURS9T81BudUGLWiKWvLk5XDiX2eq1p+sm0XBDWjPXfg4c7e3khQsuUe8sZmNeZ1geibLfeT33TdQ0zhdgeCJPW/U0lV/cFW47a/3WDwNSSo19p4eclIRDH/vhpbJOvt7DdTXgA';

/* Generated with sharp from public/image/login/arti.jpg. */
const ARTI_BLUR =
  'data:image/webp;base64,UklGRnQAAABXRUJQVlA4IGgAAADQAwCdASoQABQAPt1apkyopSOiMAgBEBuJZQAAWeh5tsWouAFifoAA/vDLhl3+4bf7CrcScjy9Qi0DsUTHWi2FRhrWP1wbqFaGh3Ilf7QAD37JBat+NKNgyHSsZN0nrCqF2fB4ywAAAA==';

export const REGISTRATION_ROLES: readonly RegistrationRole[] = [
  {
    id: 'coach',
    chip: 'TEACH & MENTOR',
    title: 'Coach / Choreographer',
    tagline: 'Turn your craft into a studio.',
    description:
      'Manage bookings, showcase your portfolio and set the hours that fit your practice — from one profile.',
    href: '/register/coach',
    image: '/image/login/choreo.jpg',
    imageAlt:
      'A choreographer seated calmly in a rehearsal studio while dancers move behind her',
    imagePosition: '50% 100%',
    imagePositionMobile: '50% 95%',
    blurDataURL: CHOREO_BLUR,
    perks: [
      {
        id: 'bookings',
        label: 'Manage bookings',
        detail: 'Accept, reschedule and track every session from your dashboard.',
        icon: CalendarCheck,
      },
      {
        id: 'portfolio',
        label: 'Showcase portfolio',
        detail: 'Put your reels, credits and teaching style where clients can find them.',
        icon: Images,
      },
      {
        id: 'availability',
        label: 'Set availability',
        detail: 'Control the days and hours you are bookable.',
        icon: Clock3,
      },
    ],
  },
  {
    id: 'client',
    chip: 'LEARN & PERFORM',
    title: 'Client / Performer',
    tagline: 'Find your next stage.',
    description:
      'Discover mentors, book sessions and join a community that keeps you moving.',
    href: '/register/client',
    image: '/image/login/arti.jpg',
    imageAlt:
      'A performer on a lit stage in front of a cheering crowd and falling confetti',
    imagePosition: '50% 85%',
    imagePositionMobile: '50% 80%',
    blurDataURL: ARTI_BLUR,
    perks: [
      {
        id: 'mentors',
        label: 'Find mentors',
        detail: 'Browse coaches by discipline, location and the skills you want to build.',
        icon: Search,
      },
      {
        id: 'sessions',
        label: 'Book sessions',
        detail: 'Pick a time, confirm and keep every booking in one calendar.',
        icon: CalendarCheck,
      },
      {
        id: 'community',
        label: 'Join community',
        detail: 'Share work, follow other performers and stay close to the scene.',
        icon: Users,
      },
    ],
  },
];

export function getRegistrationRole(id: RegistrationRoleId): RegistrationRole {
  const role = REGISTRATION_ROLES.find((entry) => entry.id === id);
  if (!role) throw new Error(`Unknown registration role: ${id}`);
  return role;
}
