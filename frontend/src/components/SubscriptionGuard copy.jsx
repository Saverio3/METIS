// src/components/SubscriptionGuard.jsx
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useStateContext } from '../contexts/ContextProvider';

const SubscriptionGuard = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const { currentColor } = useStateContext();

  useEffect(() => {
    // Check subscription status when user data is loaded
    if (isLoaded && user) {
      checkSubscriptionStatus();
    } else if (isLoaded && !user) {
      // User is not logged in, don't need to check subscription
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  const checkSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getStripeSubscriptionStatus(user.id);

      if (response.success
          && response.subscription
          && response.subscription.status === 'active') {
        // User has an active subscription
        setHasSubscription(true);
      } else {
        // No active subscription
        setHasSubscription(false);
        setShowSubscriptionModal(true);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // On error, assume no subscription and show modal
      setHasSubscription(false);
      setShowSubscriptionModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Go to subscription page
  const goToSubscriptionPage = () => {
    navigate('/account-settings?tab=subscription');
    setShowSubscriptionModal(false);
  };

  // If checking subscription status, show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
          style={{ borderColor: currentColor }}
        />
        <p className="ml-2">Verifying subscription...</p>
      </div>
    );
  }

  // If user is not logged in or has subscription, render children
  if (!user || hasSubscription) {
    return children;
  }

  // Show subscription modal and blocked content
  return (
    <>
      {/* Show blurred content in background */}
      <div className="filter blur-sm pointer-events-none">
        {children}
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Subscription Required</h2>
            <p className="mb-2 text-gray-600">
              To access the METIS MMM platform and all its features, an active subscription is required.
            </p>
            <p className="mb-6 text-gray-600">
              Please choose from our monthly, quarterly, or semi-annual plans to continue.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                onClick={() => navigate('/')}
              >
                Back to Home
              </button>
              <button
                className="px-4 py-2 text-white rounded"
                style={{ backgroundColor: currentColor }}
                onClick={goToSubscriptionPage}
              >
                View Subscription Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionGuard;
