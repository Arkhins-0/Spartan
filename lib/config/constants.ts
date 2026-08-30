/**
 * Application-wide constants
 *
 * This file contains shared constants used across the application
 * to ensure consistency and ease of maintenance.
 */

/**
 * Application domain and branding
 */
export const APP_DOMAIN = "spartan.arkhins.com";
export const APP_NAME = "Spartan";
export const APP_URL = `https://${APP_DOMAIN}`;

/**
 * Email configuration
 *
 * Outbound mail is sent from the app domain; everything a human should reply
 * to routes to the CTR Sports technical inbox.
 */
export const DEFAULT_EMAIL_FROM = `noreply@${APP_DOMAIN}`;
export const SUPPORT_EMAIL = "tech@ctrsports.in";
export const SECURITY_EMAIL = "tech@ctrsports.in";

/**
 * Contact emails
 */
export const CONTACT_EMAIL = "tech@ctrsports.in";

/**
 * Maintainer
 */
export const DEVELOPER_NAME = "Arkhins";
export const DEVELOPER_URL = "https://arkhins.com";

/**
 * External links
 */
export const DOCS_URL = "https://spartan.arkhins.com/docs";
export const GITHUB_URL = "https://github.com/Arkhins-0/Spartan";
export const INSTAGRAM_URL = "https://instagram.com/arkhins";
export const LINKEDIN_URL = "https://linkedin.com/in/krishna-vijay";

/**
 * Authentication error codes (used in CredentialsSignin.code for Auth.js v5)
 */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "invalid_credentials",
  ACCOUNT_NOT_APPROVED: "account_not_approved",
  EMAIL_NOT_VERIFIED: "email_not_verified",
  RATE_LIMITED: "rate_limited",
} as const;

/**
 * Authentication and authorization messages
 */
export const AUTH_MESSAGES = {
  SIGNUP_CHECK_EMAIL: "signup_check_email",
  SIGNUP_READY: "signup_ready",
  PASSWORD_RESET_SUCCESS: "password_reset_success",
  EMAIL_CHANGED: "email_changed",
  EMAIL_CHANGED_MESSAGE: "Email address updated — log in with your new email.",
  CHECK_EMAIL_MESSAGE: "Account created! We've sent you a verification link — check your email, then log in.",
  SIGNUP_READY_MESSAGE: "Account created! You can log in now.",
  EMAIL_VERIFIED_MESSAGE: "Email verified — you can now log in.",
  VERIFICATION_INVALID_MESSAGE: "That verification link is invalid or has expired. Log in to request a new one.",
  PASSWORD_RESET_SUCCESS_MESSAGE: "Password updated! Log in with your new password.",
  EMAIL_NOT_VERIFIED: "Please verify your email address first. Check your inbox for the verification link, or resend it below.",
  ACCOUNT_NOT_APPROVED: "This account has been suspended. Please contact support.",
  RATE_LIMITED: "Too many sign-in attempts. Please wait a few minutes and try again.",
} as const;
