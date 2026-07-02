import appIcon from '../assets/app-icon.png'

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <img
        src={appIcon}
        alt="mycel"
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
      <span style={{
        fontFamily: 'Helvetica Neue, Helvetica, var(--font-ui)',
        fontSize: size * 0.67,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: 'var(--text)',
        lineHeight: 1
      }}>
        mycel
      </span>
    </div>
  )
}
