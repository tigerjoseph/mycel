import mushroomLogo from '../assets/mycel_trans.png'

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <img
        src={mushroomLogo}
        alt="mycel"
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
      <span style={{
        fontFamily: 'Lora, serif',
        fontSize: size * 0.67,
        fontWeight: 500,
        letterSpacing: '-0.02em',
        color: '#8B4513',
        lineHeight: 1
      }}>
        mycel
      </span>
    </div>
  )
}
