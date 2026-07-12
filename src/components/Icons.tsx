import React from "react";

type P = { size?: number; className?: string };
const S = ({ size = 22, className, children }: P & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconHome = (p: P) => (
  <S {...p}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9.5h13V10" />
    <path d="M10 19.5v-5h4v5" />
  </S>
);

export const IconCar = (p: P) => (
  <S {...p}>
    <path d="M4 13.5 5.6 8.6A2 2 0 0 1 7.5 7.2h9a2 2 0 0 1 1.9 1.4L20 13.5" />
    <path d="M3.5 13.5h17a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1h-1.2a1.6 1.6 0 0 1-3.2 0H7.9a1.6 1.6 0 0 1-3.2 0H3.5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 1-1Z" />
    <circle cx="7.2" cy="15.7" r="0.4" fill="currentColor" />
    <circle cx="16.8" cy="15.7" r="0.4" fill="currentColor" />
  </S>
);

export const IconRoute = (p: P) => (
  <S {...p}>
    <circle cx="6" cy="19" r="2.2" />
    <circle cx="18" cy="5" r="2.2" />
    <path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" strokeDasharray="0.1 3.2" />
  </S>
);

export const IconUsers = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx="17" cy="9.5" r="2.3" />
    <path d="M16 14.6c2.6.2 4.5 2 4.5 4.4" />
  </S>
);

export const IconUser = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" />
  </S>
);

export const IconBell = (p: P) => (
  <S {...p}>
    <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 16Z" />
    <path d="M10.2 21a2 2 0 0 0 3.6 0" />
  </S>
);

export const IconPin = (p: P) => (
  <S {...p}>
    <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.3" />
  </S>
);

export const IconClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </S>
);

export const IconWalk = (p: P) => (
  <S {...p}>
    <circle cx="13" cy="5" r="1.8" />
    <path d="M13 8.5 10.5 12l1 3-2 5" />
    <path d="M13 8.5l2.5 2 2.5.8" />
    <path d="M11.5 15l3 1.5 1 4" />
    <path d="M10.5 12l-3 1" />
  </S>
);

export const IconSettings = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
  </S>
);

export const IconDownload = (p: P) => (
  <S {...p}>
    <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
    <path d="M4.5 17.5v2h15v-2" />
  </S>
);

export const IconWarn = (p: P) => (
  <S {...p}>
    <path d="M12 4 2.8 19.5h18.4L12 4Z" />
    <path d="M12 10v4.2" />
    <circle cx="12" cy="16.8" r="0.3" fill="currentColor" />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </S>
);

export const IconX = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </S>
);

export const IconPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconCopy = (p: P) => (
  <S {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </S>
);

export const IconLeaf = (p: P) => (
  <S {...p}>
    <path d="M5 19c0-8 5-13 14-14-.5 9-5.5 14-12 14" />
    <path d="M5 19c3-3 6-5.5 10-7" />
  </S>
);

export const IconFlag = (p: P) => (
  <S {...p}>
    <path d="M6 21V4" />
    <path d="M6 5h11l-2.5 3.5L17 12H6" />
  </S>
);

export const IconCompass = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.2 8.8-2 4.4-4.4 2 2-4.4 4.4-2Z" />
  </S>
);

export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <S {...p}>
    <path
      d="M12 3.6l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.6Z"
      fill={filled ? "currentColor" : "none"}
    />
  </S>
);

export const IconGlobe = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.6 2.3 3.9 5.1 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.1-3.9-8.5s1.3-6.2 3.9-8.5Z" />
  </S>
);

export const IconLock = (p: P) => (
  <S {...p}>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </S>
);

export const IconChevronLeft = (p: P) => (
  <S {...p}>
    <path d="M15 6l-6 6 6 6" />
  </S>
);

export const IconChevronRight = (p: P) => (
  <S {...p}>
    <path d="M9 6l6 6-6 6" />
  </S>
);
