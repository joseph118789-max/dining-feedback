import React from 'react'

const RATINGS = [1, 2, 3, 4, 5]

export default function FilterBar({ ratingFilter, onRatingChange, emailSearch, onEmailSearch }) {
  return (
    <div style={styles.bar}>
      {/* ── Email Search ── */}
      <div style={styles.searchWrap}>
        <span style={styles.icon}>🔍</span>
        <input
          type="text"
          placeholder="Search by email…"
          value={emailSearch}
          onChange={e => onEmailSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* ── Rating Filter ── */}
      <div style={styles.ratingGroup}>
        <span style={styles.ratingLabel}>Rating:</span>
        <button
          style={ratingFilter === null ? { ...styles.ratingBtn, ...styles.ratingBtnActive } : styles.ratingBtn}
          onClick={() => onRatingChange(null)}
        >
          All
        </button>
        {RATINGS.map(r => (
          <button
            key={r}
            style={ratingFilter === r ? { ...styles.ratingBtn, ...styles.ratingBtnActive } : styles.ratingBtn}
            onClick={() => onRatingChange(r)}
          >
            {r} ★
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    marginBottom: '1.5rem',
  },
  searchWrap: {
    position: 'relative',
    flex: '1 1 240px',
  },
  icon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    fontSize: '0.9rem',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '0.9rem',
    outline: 'none',
  },
  ratingGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  ratingLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#555',
    marginRight: '0.25rem',
  },
  ratingBtn: {
    padding: '0.35rem 0.7rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    transition: 'all 0.15s',
  },
  ratingBtnActive: {
    background: '#6c5ce7',
    color: '#fff',
    borderColor: '#6c5ce7',
  },
}
