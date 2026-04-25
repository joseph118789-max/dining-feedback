import React from 'react'

export default function MetricCard({ label, value, suffix, color }) {
  return (
    <div style={styles.card}>
      <p style={styles.label}>{label}</p>
      <p style={{ ...styles.value, color: color || '#333' }}>
        {value}<span style={styles.suffix}>{suffix}</span>
      </p>
    </div>
  )
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#888',
    fontWeight: '600',
  },
  value: {
    fontSize: '2rem',
    fontWeight: '700',
    lineHeight: '1',
  },
  suffix: {
    fontSize: '1rem',
    fontWeight: '400',
    color: '#888',
  },
}
