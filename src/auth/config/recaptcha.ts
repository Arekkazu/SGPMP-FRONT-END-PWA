export const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() ?? '';

export const recaptchaConfigured = recaptchaSiteKey.length > 0;
