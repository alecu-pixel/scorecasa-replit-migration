import Stripe from 'stripe';

/**
 * Stripe Client Configuration
 * 
 * Uses environment variables for Stripe credentials:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_live_ or sk_test_)
 * - VITE_STRIPE_PUBLIC_KEY: Your Stripe publishable key (pk_live_ or pk_test_)
 * - STRIPE_WEBHOOK_SECRET: Your webhook signing secret (whsec_)
 * 
 * Note: Manual configuration used instead of Replit connector.
 * See replit.md for details.
 */

function getCredentials() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.VITE_STRIPE_PUBLIC_KEY;
  const webhookSecretKey = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  if (!publishableKey) {
    throw new Error('VITE_STRIPE_PUBLIC_KEY environment variable is required');
  }

  if (!webhookSecretKey) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
  }

  return {
    publishableKey,
    secretKey,
    webhookSecretKey,
  };
}

// WARNING: Never cache this client.
// Always call this function again to get a fresh client.
// Use getUncachableStripeClient() for server-side operations with secret key
export async function getUncachableStripeClient() {
  const { secretKey } = getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
  });
}

// Use getStripePublishableKey() for client-side operations
export async function getStripePublishableKey() {
  const { publishableKey } = getCredentials();

  return publishableKey;
}

// Use getStripeSecretKey() for server-side operations requiring the secret key
export async function getStripeSecretKey() {
  const { secretKey } = getCredentials();
  return secretKey;
}

// Use getStripeWebhookSecret() for server-side operations with webhook secret
export async function getStripeWebhookSecret() {
  const { webhookSecretKey } = getCredentials();
  return webhookSecretKey;
}
