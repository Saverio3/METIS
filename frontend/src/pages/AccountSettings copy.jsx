import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useStripe } from '@stripe/react-stripe-js';
import apiService from '../services/api';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import { FiUser, FiLock, FiCreditCard } from 'react-icons/fi';
import { BsShieldLock } from 'react-icons/bs';
import avatar from '../data/avatar.jpg';

const AccountSettings = () => {
  const { currentColor } = useStateContext();
  const { user, isLoaded } = useUser();
  const { client } = useClerk();
  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Payment states
  const stripe = useStripe();

  const handleSubscription = async (priceId) => {
    if (!stripe) return;

    try {
      // Get or create a Stripe customer ID for the current user
      const response = await apiService.createStripeCheckoutSession(priceId);

      // Redirect to Stripe checkout
      const result = await stripe.redirectToCheckout({
        sessionId: response.id
      });

      if (result.error) {
        console.error(result.error.message);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Load user data when available
  React.useEffect(() => {
    if (isLoaded && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.primaryEmailAddress?.emailAddress || '');
      // Company name might be found in unsafeMetadata instead of publicMetadata
      setCompanyName(user.unsafeMetadata?.companyName || '');
    }
  }, [isLoaded, user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      // Use the user.update method properly without public_metadata
      await user.update({
        firstName,
        lastName,
        unsafeMetadata: {
          ...user.unsafeMetadata,
          companyName
        }
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveError(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setSaveError('New passwords do not match');
      return;
    }

    try {
      // Note: Password changes in Clerk typically require session management
      // For now, we'll just show an info message
      alert('Password change functionality requires special Clerk integration. Please use the Clerk dashboard to change your password for now.');
    } catch (error) {
      console.error('Error updating password:', error);
      setSaveError(error.message || 'Failed to update password');
    }
  };

  // Render loading state
  if (!isLoaded) {
    return (
      <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
        <Header category="Account" title="Account Settings" />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" style={{ borderColor: currentColor }}></div>
          <p className="ml-2">Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <Header category="Account" title="Account Settings" />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar navigation */}
        <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex flex-col items-center mb-6">
            <img
              src={user?.imageUrl || avatar}
              alt="Profile"
              className="rounded-full w-24 h-24 mb-4 border-4"
              style={{ borderColor: currentColor }}
            />
            <h3 className="text-lg font-semibold dark:text-gray-200">{user?.fullName || 'User Name'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.primaryEmailAddress?.emailAddress || 'user@example.com'}</p>
          </div>

          <nav>
            <ul className="space-y-2">
              <li>
                <button
                  className={`flex items-center w-full p-3 rounded-lg text-left ${
                    activeTab === 'profile'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-white dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setActiveTab('profile')}
                >
                  <FiUser className="mr-3" size={18} style={{ color: currentColor }} />
                  <span className="dark:text-gray-200">Profile Information</span>
                </button>
              </li>
              <li>
                <button
                  className={`flex items-center w-full p-3 rounded-lg text-left ${
                    activeTab === 'password'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-white dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setActiveTab('password')}
                >
                  <FiLock className="mr-3" size={18} style={{ color: currentColor }} />
                  <span className="dark:text-gray-200">Password & Security</span>
                </button>
              </li>
              <li>
                <button
                  className={`flex items-center w-full p-3 rounded-lg text-left ${
                    activeTab === 'subscription'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-white dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setActiveTab('subscription')}
                >
                  <FiCreditCard className="mr-3" size={18} style={{ color: currentColor }} />
                  <span className="dark:text-gray-200">Subscription</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 bg-white dark:bg-secondary-dark-bg rounded-lg p-6 shadow-sm">
          {/* Status Messages */}
          {saveError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {saveError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Profile updated successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 dark:text-gray-200">Profile Information</h2>

              <form onSubmit={handleProfileUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-gray-300"
                      value={email}
                      disabled
                      title="Email cannot be changed"
                    />
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                      Contact support to change your email address
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    style={{ backgroundColor: currentColor }}
                    className="px-4 py-2 text-white rounded-md"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Password & Security Tab */}
          {activeTab === 'password' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 dark:text-gray-200">Password & Security</h2>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 dark:bg-blue-900/20 dark:border-blue-400">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <BsShieldLock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Keeping your account secure is important. We recommend using a strong, unique password.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePasswordUpdate}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                      Password must be at least 8 characters and include a number and a special character
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    style={{ backgroundColor: currentColor }}
                    className="px-4 py-2 text-white rounded-md"
                  >
                    Update Password
                  </button>
                </div>
              </form>

              <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="text-lg font-medium dark:text-gray-200 mb-4">Two-Factor Authentication</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Enhance your account security by enabling two-factor authentication.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      We'll send a verification code to your email or phone when you sign in.
                    </p>
                  </div>

                  <button
                    style={{ backgroundColor: currentColor }}
                    className="px-4 py-2 text-white rounded-md"
                    onClick={() => alert('2FA setup will be implemented with Clerk')}
                  >
                    Setup 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 dark:text-gray-200">Subscription Management</h2>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 dark:bg-gray-700 dark:border-gray-600">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium dark:text-gray-200">Current Plan: Free Trial</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Your trial ends in 14 days on May 20, 2025
                    </p>
                  </div>

                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                    Active
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-sm dark:text-gray-300">Up to 3 models</span>
                  </div>

                  <div className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-sm dark:text-gray-300">Basic variable transformations</span>
                  </div>

                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-sm dark:text-gray-300">Excel export</span>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-medium dark:text-gray-200 mb-4">Available Plans</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Starter Plan */}
                <div className="border border-gray-200 rounded-lg p-6 dark:border-gray-600">
                  <h4 className="text-lg font-medium dark:text-gray-200">Starter</h4>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-bold dark:text-gray-200">$99</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Perfect for individuals and small teams.
                  </p>

                  <ul className="mt-4 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Up to 3 models</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Basic variable transformations</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Excel export</span>
                    </li>
                  </ul>

                  <button
                    className="mt-6 w-full"
                    style={{ backgroundColor: currentColor, color: 'white', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontWeight: '500' }}
                    onClick={() => alert('Subscription upgrade will be implemented with Stripe')}
                  >
                    Choose Plan
                  </button>
                </div>

                {/* Professional Plan */}
                <div className="border-2 relative border-indigo-500 rounded-lg p-6 shadow-md dark:border-indigo-400">
                  <div className="absolute top-0 inset-x-0 transform -translate-y-1/2 flex justify-center">
                    <span className="bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>

                  <h4 className="text-lg font-medium dark:text-gray-200">Professional</h4>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-bold dark:text-gray-200">$199</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    For teams who need advanced functionality.
                  </p>

                  <ul className="mt-4 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Unlimited models</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Advanced transformations</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Advanced curve fitting</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Advanced diagnostic tests</span>
                    </li>
                  </ul>

                  <button
                    className="mt-6 w-full"
                    style={{ backgroundColor: currentColor, color: 'white', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontWeight: '500' }}
                    onClick={() => alert('Subscription upgrade will be implemented with Stripe')}
                  >
                    Choose Plan
                  </button>
                </div>

                {/* Enterprise Plan */}
                <div className="border border-gray-200 rounded-lg p-6 dark:border-gray-600">
                  <h4 className="text-lg font-medium dark:text-gray-200">Enterprise</h4>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-bold dark:text-gray-200">$499</span>
                    <span className="ml-1 text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    For large organizations with complex needs.
                  </p>

                  <ul className="mt-4 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Unlimited models</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">All features included</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Multi-user access</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm dark:text-gray-300">Priority support</span>
                    </li>
                  </ul>

                  <button
                    className="mt-6 w-full"
                    style={{ backgroundColor: currentColor, color: 'white', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontWeight: '500' }}
                    onClick={() => alert('Subscription upgrade will be implemented with Stripe')}
                  >
                    Contact Sales
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="text-lg font-medium dark:text-gray-200 mb-4">Billing History</h3>

                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    No billing history available yet.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;