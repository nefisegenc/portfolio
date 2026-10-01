const Svg = ({ size = 20, children, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
    >
        {children}
    </svg>
);

export const CloseIcon = (p) => (
    <Svg {...p}>
        <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
);

export const ExternalIcon = (p) => (
    <Svg {...p}>
        <path d="M7 17 17 7M8 7h9v9" />
    </Svg>
);

export const ChevronLeft = (p) => (
    <Svg {...p}>
        <path d="m15 18-6-6 6-6" />
    </Svg>
);

export const ChevronRight = (p) => (
    <Svg {...p}>
        <path d="m9 18 6-6-6-6" />
    </Svg>
);

export const CheckIcon = (p) => (
    <Svg {...p}>
        <path d="M20 6 9 17l-5-5" />
    </Svg>
);

export const MapIcon = (p) => (
    <Svg {...p}>
        <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z" />
        <path d="M9 4v13.5M15 6.5V20" />
    </Svg>
);

export const MoonIcon = (p) => (
    <Svg {...p}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </Svg>
);

export const SunIcon = (p) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
);

export const GridIcon = (p) => (
    <Svg {...p}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </Svg>
);

export const PinIcon = (p) => (
    <Svg {...p}>
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
    </Svg>
);

export const MailIcon = (p) => (
    <Svg {...p}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m4 7 8 6 8-6" />
    </Svg>
);

export const ArrowUpIcon = (p) => (
    <Svg {...p}>
        <path d="M12 19V5M5 12l7-7 7 7" />
    </Svg>
);

export const HelpIcon = (p) => (
    <Svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </Svg>
);

export const PlayIcon = (p) => (
    <Svg {...p} fill="currentColor" stroke="none">
        <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.7L9.5 4.6A1 1 0 0 0 8 5.5Z" />
    </Svg>
);

export const StarIcon = (p) => (
    <Svg {...p} fill="currentColor" stroke="none">
        <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
    </Svg>
);

export const GithubIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.17c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
);

export const LinkedinIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
);

// A tiny portrait matching the 3D avatar: blonde hair, green eyes.
export const Avatar = ({ size = 44 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="24" fill="#FFD9B8" />
        <path d="M9 44c0-12 5-26 15-26s15 14 15 26Z" fill="#E8C078" />
        <circle cx="24" cy="24" r="10.5" fill="#F0CDBF" />
        <path d="M13.2 22.5c0-8 4.8-12.5 10.8-12.5s10.8 4.5 10.8 12.5c-3.5-1.2-7.8-4.5-9.2-7.8-2 3.8-6.5 6.8-12.4 7.8Z" fill="#E8C078" />
        <circle cx="20" cy="25.5" r="1.6" fill="#3F6E4D" />
        <circle cx="28" cy="25.5" r="1.6" fill="#3F6E4D" />
        <path d="M21.5 29.8c1.5 1.1 3.5 1.1 5 0" stroke="#C4706E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M14 44c1.5-6 5.5-9 10-9s8.5 3 10 9Z" fill="#1E1E24" />
        <path d="M23 36h2v8h-2Z" fill="#3BE8FF" />
    </svg>
);

export const SoundOnIcon = (p) => (
    <Svg {...p}>
        <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </Svg>
);

export const SoundOffIcon = (p) => (
    <Svg {...p}>
        <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" />
        <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </Svg>
);

export const DownloadIcon = (p) => (
    <Svg {...p}>
        <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
    </Svg>
);
