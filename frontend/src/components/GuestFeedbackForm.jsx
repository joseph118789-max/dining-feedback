import { useState } from 'react';
import { z } from 'zod';
import StarRating from './StarRating';

const BRANCHES = [
  'Seri Kembangan',
  'P.P. Seri Kembangan',
  'Bandar Puteri Puchong',
  'Sungai Way Petaling Jaya',
  'Bandar Menjalara',
  'SS15 Subang Jaya',
  'Bukit Tinggi 2',
];

const guestFeedbackSchema = z.object({
  phone: z.string().min(1, 'Phone number is required for guest feedback'),
  rating: z.number().min(1, 'Please select a rating').max(5),
  branch: z.string().min(1, 'Please select a branch'),
  feedback: z
    .string()
    .min(10, 'Please share at least 10 characters')
    .max(1000, 'Feedback must be under 1000 characters'),
});

export default function GuestFeedbackForm() {
  const [rating, setRating] = useState(0);
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const result = guestFeedbackSchema.safeParse({ phone, rating, branch, feedback: feedbackText });
    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      return fieldErrors;
    }
    return {};
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldErrors = validate();
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const allTouched = { rating: true, phone: true, feedback: true };
    setTouched(allTouched);

    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/feedback/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          branch,
          rating,
          comments: feedbackText,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data?.errors) ? data.errors[0]?.msg : data?.error || 'Submission failed';
        setErrors({ feedback: msg });
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setErrors({ feedback: err.message || 'Network error — please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = feedbackText.length;
  const maxChars = 1000;

  if (submitted) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-dining-100 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-dining-900 mb-2">Thank You!</h3>
        <p className="text-dining-500 text-sm">Your feedback has been received. We appreciate you taking the time to share your experience with us.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white rounded-3xl shadow-xl p-6 border border-dining-100 space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold text-dining-800">Guest Feedback</h2>
        <p className="text-xs text-dining-400">No login required — just your phone number</p>
      </div>

      {/* Branch (required) */}
      <div>
        <label htmlFor="branch" className="block text-xs font-semibold text-dining-400 uppercase tracking-wide mb-1">
          Branch <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-dining-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <select
            id="branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            onBlur={() => handleBlur('branch')}
            className={`w-full pl-10 pr-4 py-3 text-sm bg-dining-50 border rounded-xl text-dining-900 appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-dining-400 focus:border-transparent ${
              touched.branch && errors.branch ? 'border-red-400 bg-red-50' : 'border-dining-200'
            }`}
          >
            <option value="">Select a branch</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-dining-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {touched.branch && errors.branch && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.branch}
          </p>
        )}
      </div>

      {/* Phone (required for guests) */}
      <div>
        <label htmlFor="phone" className="block text-xs font-semibold text-dining-400 uppercase tracking-wide mb-1">
          Phone Number <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-dining-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+60123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => handleBlur('phone')}
            className={`w-full pl-10 pr-4 py-3 text-sm bg-dining-50 border rounded-xl text-dining-900 placeholder-dining-300 transition-colors focus:outline-none focus:ring-2 focus:ring-dining-400 focus:border-transparent ${
              touched.phone && errors.phone ? 'border-red-400 bg-red-50' : 'border-dining-200'
            }`}
          />
        </div>
        {touched.phone && errors.phone && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.phone}
          </p>
        )}
      </div>

      {/* Star Rating */}
      <div className="pt-2">
        <p className="block text-xs font-semibold text-dining-400 uppercase tracking-wide text-center mb-3">
          How was your dining experience?
        </p>
        <StarRating value={rating} onChange={setRating} error={touched.rating ? errors.rating : undefined} />
      </div>

      {/* Feedback Textarea */}
      <div>
        <label htmlFor="feedback" className="block text-xs font-semibold text-dining-400 uppercase tracking-wide mb-1">
          Your Feedback
        </label>
        <textarea
          id="feedback"
          rows={5}
          placeholder="Tell us about your experience — food, service, ambiance..."
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          onBlur={() => handleBlur('feedback')}
          className={`w-full px-4 py-3 text-sm bg-dining-50 border rounded-xl text-dining-900 placeholder-dining-300 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-dining-400 focus:border-transparent ${
            touched.feedback && errors.feedback ? 'border-red-400 bg-red-50' : 'border-dining-200'
          }`}
        />
        <div className="flex justify-between items-center mt-1.5">
          {touched.feedback && errors.feedback ? (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.feedback}
            </p>
          ) : <span />}
          <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-orange-500' : 'text-dining-300'}`}>
            {charCount}/{maxChars}
          </span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 bg-dining-600 hover:bg-dining-700 active:bg-dining-800 text-white font-semibold text-sm rounded-xl shadow-md transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting…
          </>
        ) : (
          <>
            Submit Feedback
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}