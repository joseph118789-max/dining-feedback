import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

export default function SignUpForm({ onSuccess, onError, onSwitchToSignIn }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = t('errorRequired');
    if (!form.email.trim()) {
      errs.email = t('errorRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = t('invalidEmail');
    }
    if (!form.phone.trim()) {
      errs.phone = t('errorRequired');
    } else if (!/^[+\d\s\-()]{7,15}$/.test(form.phone.replace(/\s/g, ''))) {
      errs.phone = t('invalidPhone');
    }
    if (!form.password) {
      errs.password = t('errorRequired');
    } else if (form.password.length < 6) {
      errs.password = t('passwordMinLen');
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = t('passwordMismatch');
    }
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name.trim(),
            phone: form.phone.trim(),
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      // If no email confirmation required (e.g. in dev), session is set
      if (data.session) {
        onSuccess?.();
      } else {
        // Email confirmation sent
        setSuccess(true);
      }
    } catch (err) {
      onError?.(err.message || t('signUpError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-dining-900 mb-2">{t('signUpSuccessTitle')}</h3>
        <p className="text-sm text-dining-500 mb-4">{t('signUpSuccessMsg')}</p>
        <button onClick={onSwitchToSignIn} className="text-sm text-dining-500 hover:text-dining-700">
          {t('backToSignIn')}
        </button>
      </div>
    );
  }

  const inputStyle = (field) => ({
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: `1.5px solid ${errors[field] ? '#ef4444' : '#e5e7eb'}`,
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#fff',
    color: '#1f2937',
  });

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px',
  };

  const errStyle = {
    fontSize: '11px',
    color: '#ef4444',
    marginTop: '3px',
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-3">
        {/* Name */}
        <div>
          <label style={labelStyle}>{t('fullName')}</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={t('fullNamePlaceholder')}
            style={inputStyle('name')}
            autoComplete="name"
          />
          {errors.name && <p style={errStyle}>{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>{t('emailAddr')}</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            style={inputStyle('email')}
            autoComplete="email"
          />
          {errors.email && <p style={errStyle}>{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label style={labelStyle}>{t('phone')}</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="+60123456789"
            style={inputStyle('phone')}
            autoComplete="tel"
          />
          {errors.phone && <p style={errStyle}>{errors.phone}</p>}
        </div>

        {/* Password */}
        <div>
          <label style={labelStyle}>{t('password')}</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder={t('passwordPlaceholder')}
            style={inputStyle('password')}
            autoComplete="new-password"
          />
          {errors.password && <p style={errStyle}>{errors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label style={labelStyle}>{t('confirmPassword')}</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder={t('passwordPlaceholder')}
            style={inputStyle('confirmPassword')}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <p style={errStyle}>{errors.confirmPassword}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px',
          background: loading ? '#9ca3af' : '#2563eb',
          color: '#fff',
          borderRadius: '12px',
          fontWeight: '600',
          fontSize: '15px',
          cursor: loading ? 'not-allowed' : 'pointer',
          border: 'none',
          transition: 'background 0.2s',
        }}
      >
        {loading ? t('signingUp') : t('createAccount')}
      </button>

      <p className="text-center text-dining-400 text-xs mt-3">
        {t('alreadyHaveAccount')}{' '}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          style={{ color: '#2563eb', cursor: 'pointer', background: 'none', border: 'none', fontSize: '13px', fontWeight: '500' }}
        >
          {t('signInLink')}
        </button>
      </p>
    </form>
  );
}
