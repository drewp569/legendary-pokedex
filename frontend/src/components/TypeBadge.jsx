export default function TypeBadge({ type, size = 'md' }) {
  return (
    <span
      className={`type-badge type-badge-${size}`}
      style={{
        background: `var(--type-${type}, #666)`,
        color: '#fff',
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        borderRadius: 20,
        fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        display: 'inline-block',
        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
      }}
    >
      {type}
    </span>
  );
}
