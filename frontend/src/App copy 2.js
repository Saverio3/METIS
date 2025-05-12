import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useUser
} from '@clerk/clerk-react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from './services/stripe';

import { Navbar, Footer, Sidebar, ThemeSettings } from './components';
import { Ecommerce, Orders, Calendar, Employees, Stacked, Pyramid, Customers, Kanban, Line, Area, Bar, Pie, Financial, ColorPicker, ColorMapping, Editor } from './pages';
import './App.css';

// Import our landing page and other pages
import Landing from './pages/Landing';
import DataUpload from './pages/DataUpload';
import VariableWorkshop from './pages/VariableWorkshop';
import Charts from './pages/Charts';
import Decomposition from './pages/Decomposition';
import ModelDiagnostics from './pages/ModelDiagnostics';
import ContributionGroups from './pages/ContributionGroups';
import VariableTesting from './pages/VariableTesting';
import CurveTesting from './pages/CurveTesting';
import ModelBuilder from './pages/ModelBuilder';
import ModelLibrary from './pages/ModelLibrary';
import AccountSettings from './pages/AccountSettings';

import { useStateContext } from './contexts/ContextProvider';

// Import SubscriptionGuard component
import SubscriptionGuard from './components/SubscriptionGuard';

// Import Clerk components for authentication
if (!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// AuthRedirect component to handle redirection when user is authenticated
const AuthRedirect = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if they're explicitly on signin/signup pages
    if (isLoaded && isSignedIn &&
        (location.pathname.includes('/sign-in') ||
         location.pathname.includes('/sign-up'))) {
      navigate('/data-upload');
    }
  }, [isSignedIn, isLoaded, navigate, location]);

  return null;
};

// Create a wrapper component that conditionally renders the app layout
const AppLayout = ({ children }) => {
  const { setCurrentColor, setCurrentMode, currentMode, activeMenu, currentColor, themeSettings, setThemeSettings } = useStateContext();

  useEffect(() => {
    const currentThemeColor = localStorage.getItem('colorMode');
    const currentThemeMode = localStorage.getItem('themeMode');
    if (currentThemeColor && currentThemeMode) {
      setCurrentColor(currentThemeColor);
      setCurrentMode(currentThemeMode);
    }
  }, [setCurrentColor, setCurrentMode]);

  return (
    <div className={currentMode === 'Dark' ? 'dark' : ''}>
      <div className="flex relative dark:bg-main-dark-bg">
        <div className="fixed right-4 bottom-4" style={{ zIndex: '1000' }}>
          <TooltipComponent content="Settings" position="Top">
            <button
              type="button"
              onClick={() => setThemeSettings(true)}
              style={{ background: currentColor, borderRadius: '50%' }}
              className="text-3xl text-white p-3 hover:drop-shadow-xl hover:bg-light-gray"
            >
              <FiSettings />
            </button>
          </TooltipComponent>
        </div>
        {activeMenu ? (
          <div className="w-72 fixed sidebar dark:bg-secondary-dark-bg bg-white">
            <Sidebar />
          </div>
        ) : (
          <div className="w-0 dark:bg-secondary-dark-bg">
            <Sidebar />
          </div>
        )}
        <div
          className={
            activeMenu
              ? 'dark:bg-main-dark-bg bg-main-bg min-h-screen md:ml-72 w-full'
              : 'bg-main-bg dark:bg-main-dark-bg w-full min-h-screen flex-2'
          }
        >
          <div className="fixed md:static bg-main-bg dark:bg-main-dark-bg navbar w-full">
            <Navbar />
          </div>
          <div>
            {themeSettings && <ThemeSettings />}
            {children}
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

// Protected route component with subscription guard
const ProtectedRoute = ({ children }) => {
  return (
    <>
      <SignedIn>
        <SubscriptionGuard>
          {children}
        </SubscriptionGuard>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

// Route for account settings (protected but without subscription check)
const AccountSettingsRoute = ({ children }) => {
  return (
    <>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

const App = () => {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Elements stripe={stripePromise}>
        <BrowserRouter>
          <AuthRedirect />
          <Routes>
            {/* Landing Page (no sidebar/navbar) */}
            <Route path="/" element={<Landing />} />

            {/* Authentication routes */}
            <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" redirectUrl="/data-upload" />} />
            <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" redirectUrl="/data-upload" />} />

            {/* Account Settings - Protected but no subscription requirement */}
            <Route path="/account-settings" element={
              <AccountSettingsRoute>
                <AppLayout><AccountSettings /></AppLayout>
              </AccountSettingsRoute>
            } />

            {/* Protected App routes with subscription guard */}
            <Route path="/data-upload" element={
              <ProtectedRoute>
                <AppLayout><DataUpload /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/variable-workshop" element={
              <ProtectedRoute>
                <AppLayout><VariableWorkshop /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/variable-charts" element={
              <ProtectedRoute>
                <AppLayout><Charts /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/decomposition" element={
              <ProtectedRoute>
                <AppLayout><Decomposition /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/model-diagnostics" element={
              <ProtectedRoute>
                <AppLayout><ModelDiagnostics /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/contribution-groups" element={
              <ProtectedRoute>
                <AppLayout><ContributionGroups /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/variable-testing" element={
              <ProtectedRoute>
                <AppLayout><VariableTesting /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/curve-testing" element={
              <ProtectedRoute>
                <AppLayout><CurveTesting /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/model-builder" element={
              <ProtectedRoute>
                <AppLayout><ModelBuilder /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/model-library" element={
              <ProtectedRoute>
                <AppLayout><ModelLibrary /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <AppLayout><Orders /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/employees" element={
              <ProtectedRoute>
                <AppLayout><Employees /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute>
                <AppLayout><Customers /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/kanban" element={
              <ProtectedRoute>
                <AppLayout><Kanban /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/editor" element={
              <ProtectedRoute>
                <AppLayout><Editor /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <AppLayout><Calendar /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/color-picker" element={
              <ProtectedRoute>
                <AppLayout><ColorPicker /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/line" element={
              <ProtectedRoute>
                <AppLayout><Line /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/area" element={
              <ProtectedRoute>
                <AppLayout><Area /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/bar" element={
              <ProtectedRoute>
                <AppLayout><Bar /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/pie" element={
              <ProtectedRoute>
                <AppLayout><Pie /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/financial" element={
              <ProtectedRoute>
                <AppLayout><Financial /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/color-mapping" element={
              <ProtectedRoute>
                <AppLayout><ColorMapping /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/pyramid" element={
              <ProtectedRoute>
                <AppLayout><Pyramid /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/stacked" element={
              <ProtectedRoute>
                <AppLayout><Stacked /></AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </Elements>
    </ClerkProvider>
  );
};

export default App;