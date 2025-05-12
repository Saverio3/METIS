import { loadStripe } from '@stripe/stripe-js';
import apiService from './api';

// Initialize Stripe with your publishable key
export const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Function to create a checkout session
export const createCheckoutSession = async (priceId, userId) => {
  try {
    const response = await apiService.createStripeCheckoutSession(priceId, userId);
    return response;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Function to redirect to customer portal
export const redirectToCustomerPortal = async (customerId) => {
  try {
    const response = await apiService.createStripeCustomerPortal(customerId);
    if (response.success && response.url) {
      window.location.href = response.url;
    }
    return response;
  } catch (error) {
    console.error('Error redirecting to customer portal:', error);
    throw error;
  }
};

// Function to get subscription status
export const getSubscriptionStatus = async (userId) => {
  try {
    const response = await apiService.getStripeSubscriptionStatus(userId);
    return response;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
};
