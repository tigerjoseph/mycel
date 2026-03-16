export function LogoShowcase() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <svg width={400} height={400} viewBox="0 0 200 200" fill="none">
        {/* ── Cap ── */}
        {/* Main cap shape — broad dome, muted red-brown like reference */}
        <path
          d="M56 108 C56 78 68 52 100 40 C132 52 144 78 144 108 Z"
          fill="#A44B3B"
        />
        {/* Slightly darker shadow on left side of cap */}
        <path
          d="M56 108 C56 82 64 58 82 46 L80 108 Z"
          fill="#934339"
        />
        {/* Lighter highlight on right of cap */}
        <path
          d="M120 46 C136 58 142 78 144 108 L126 108 Z"
          fill="#B05443"
          opacity="0.5"
        />

        {/* ── Spots — cream/tan, various sizes, scattered naturally ── */}
        {/* Large spots */}
        <ellipse cx="88" cy="64" rx="5.5" ry="5" fill="#E8D5B8" />
        <ellipse cx="112" cy="60" rx="6" ry="5" fill="#E8D5B8" />
        <ellipse cx="76" cy="82" rx="5" ry="4.5" fill="#E8D5B8" />
        <ellipse cx="124" cy="78" rx="5" ry="4.5" fill="#E8D5B8" />
        <ellipse cx="100" cy="52" rx="4" ry="3.5" fill="#E8D5B8" />
        {/* Medium spots */}
        <ellipse cx="96" cy="76" rx="4" ry="3.5" fill="#E8D5B8" />
        <ellipse cx="110" cy="84" rx="3.5" ry="3" fill="#E8D5B8" />
        <ellipse cx="68" cy="96" rx="3.5" ry="3" fill="#E8D5B8" />
        <ellipse cx="130" cy="94" rx="3" ry="2.5" fill="#E8D5B8" />
        <ellipse cx="84" cy="94" rx="3" ry="2.5" fill="#E8D5B8" />
        {/* Small spots */}
        <circle cx="104" cy="68" r="2.5" fill="#E8D5B8" />
        <circle cx="76" cy="70" r="2" fill="#E8D5B8" />
        <circle cx="118" cy="70" r="2" fill="#E8D5B8" />
        <circle cx="92" cy="88" r="2" fill="#E8D5B8" />
        <circle cx="116" cy="96" r="2" fill="#E8D5B8" />
        <circle cx="108" cy="96" r="1.5" fill="#E8D5B8" />
        <circle cx="72" cy="104" r="1.5" fill="#E8D5B8" />
        <circle cx="126" cy="104" r="1.5" fill="#E8D5B8" />
        {/* Tiny dots */}
        <circle cx="96" cy="58" r="1.5" fill="#E8D5B8" />
        <circle cx="82" cy="74" r="1.5" fill="#E8D5B8" />
        <circle cx="120" cy="88" r="1.5" fill="#E8D5B8" />
        <circle cx="90" cy="100" r="1.2" fill="#E8D5B8" />
        <circle cx="100" cy="94" r="1.2" fill="#E8D5B8" />

        {/* ── Gills — radiating lines under cap, muted pink-brown ── */}
        <g stroke="#B5806E" strokeWidth="0.6" opacity="0.55">
          <line x1="68" y1="108" x2="74" y2="114" />
          <line x1="74" y1="108" x2="78" y2="114" />
          <line x1="80" y1="108" x2="82" y2="115" />
          <line x1="85" y1="108" x2="86" y2="115" />
          <line x1="90" y1="108" x2="90" y2="116" />
          <line x1="95" y1="108" x2="94" y2="116" />
          <line x1="100" y1="108" x2="100" y2="116" />
          <line x1="105" y1="108" x2="106" y2="116" />
          <line x1="110" y1="108" x2="110" y2="116" />
          <line x1="115" y1="108" x2="114" y2="115" />
          <line x1="120" y1="108" x2="118" y2="115" />
          <line x1="126" y1="108" x2="122" y2="114" />
          <line x1="132" y1="108" x2="126" y2="114" />
        </g>
        {/* Gill area — subtle shape between cap and stem */}
        <path
          d="M72 108 C80 116 90 118 100 118 C110 118 120 116 128 108"
          fill="#C9A08E"
          opacity="0.3"
        />

        {/* ── Stem — tapered, beige/tan, slightly wider at base ── */}
        <path
          d="M90 116 C89 130 88 148 87 164 L113 164 C112 148 111 130 110 116"
          fill="#C8B99A"
        />
        {/* Stem left shadow */}
        <path
          d="M90 116 C89 130 88 148 87 164 L96 164 C95 148 94 130 94 116"
          fill="#BBA98A"
          opacity="0.5"
        />
        {/* Stem right highlight */}
        <path
          d="M106 116 C107 130 108 148 109 164 L113 164 C112 148 111 130 110 116"
          fill="#D4C8AE"
          opacity="0.4"
        />
      </svg>
    </div>
  )
}
