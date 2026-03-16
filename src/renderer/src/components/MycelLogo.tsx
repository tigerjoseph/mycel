interface MycelLogoProps {
  size?: number
  color?: string
}

export function MycelLogo({ size = 20, color = 'currentColor' }: MycelLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Central node */}
      <circle cx="12" cy="12" r="2" fill={color} />
      {/* Branching paths — thin curved lines radiating outward */}
      <path d="M12 12 C10 9, 7 7, 4 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12 C14 9, 17 6, 20 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12 C10 14, 6 17, 4 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12 C15 14, 18 17, 20 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Secondary branches */}
      <path d="M7 7 C5 8, 3 10, 2 12" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M17 6 C19 7, 21 9, 22 11" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M6 17 C4 16, 2 14, 1 12" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* Tip dots */}
      <circle cx="4" cy="5" r="1" fill={color} opacity="0.8" />
      <circle cx="20" cy="4" r="1" fill={color} opacity="0.8" />
      <circle cx="4" cy="20" r="1" fill={color} opacity="0.8" />
      <circle cx="20" cy="20" r="1" fill={color} opacity="0.8" />
      <circle cx="2" cy="12" r="0.8" fill={color} opacity="0.5" />
      <circle cx="22" cy="11" r="0.8" fill={color} opacity="0.5" />
    </svg>
  )
}
