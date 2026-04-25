import { useState } from 'react';

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function StarRating({ value, onChange, error }) {
  const [hovered, setHovered] = useState(0);

  const active = hovered || value;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            className="transition-transform duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-dining-400 focus:ring-offset-2 rounded-full"
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-10 h-10 transition-colors duration-150 ${
                star <= active ? 'text-dining-500' : 'text-dining-200'
              }`}
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>

      {active > 0 && (
        <p className="text-center text-sm font-medium text-dining-600">
          {STAR_LABELS[active - 1]}
        </p>
      )}

      {error && (
        <p className="text-center text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
