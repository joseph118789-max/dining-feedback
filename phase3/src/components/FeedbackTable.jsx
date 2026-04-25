import React from 'react'

const STAR_COLORS = { 1: '#e74c3c', 2: '#e67e22', 3: '#f1c40f', 4: '#2ecc71', 5: '#27ae60' }

function StarRating({ value }) {
  return (
    <span title={`${value} / 5`} style={{ letterSpacing: '0.1em' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < value ? STAR_COLORS[value] : '#ddd' }}>★</span>
      ))}
    </span>
  )
}

export default function FeedbackTable({ data }) {
  if (data.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No feedback entries match your current filters.</p>
      </div>
    )
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {['Date', 'Email', 'Phone', 'Rating', 'Comment'].map(col => (
              <th key={col} style={styles.th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id} style={styles.tr}>
              <td style={styles.td}>{row.date}</td>
              <td style={styles.td}>{row.email}</td>
              <td style={styles.td}>{row.phone}</td>
              <td style={styles.td}><StarRating value={row.rating} /></td>
              <td style={{ ...styles.td, ...styles.commentCell }}>{row.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  tableWrap: {
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
    minWidth: '600px',
  },
  th: {
    padding: '0.85rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#888',
    fontWeight: '600',
    borderBottom: '2px solid #f0f0f0',
    background: '#fafafa',
  },
  tr: {
    borderBottom: '1px solid #f5f5f5',
    transition: 'background 0.1s',
  },
  td: {
    padding: '0.85rem 1rem',
    color: '#333',
    verticalAlign: 'top',
  },
  commentCell: {
    maxWidth: '320px',
    color: '#555',
  },
  empty: {
    padding: '3rem',
    textAlign: 'center',
    color: '#999',
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
}
