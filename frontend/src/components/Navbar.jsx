import React, { useEffect } from 'react';
import { AiOutlineMenu } from 'react-icons/ai';
import { FiShoppingCart } from 'react-icons/fi';
import { BsChatLeft } from 'react-icons/bs';
import { RiNotification3Line } from 'react-icons/ri';
import { MdKeyboardArrowDown, MdOutlineCancel } from 'react-icons/md';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { Link, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';

import avatar from '../data/avatar.jpg';
import { Cart, Chat, Notification, UserProfile } from '.';
import { useStateContext } from '../contexts/ContextProvider';

const NavButton = ({ title, customFunc, icon, color, dotColor }) => (
  <TooltipComponent content={title} position="BottomCenter">
    <button
      type="button"
      onClick={() => customFunc()}
      style={{ color }}
      className="relative text-xl rounded-full p-3 hover:bg-light-gray"
    >
      <span
        style={{ background: dotColor }}
        className="absolute inline-flex rounded-full h-2 w-2 right-2 top-2"
      />
      {icon}
    </button>
  </TooltipComponent>
);

const Navbar = () => {
  const {
    currentColor,
    activeMenu,
    setActiveMenu,
    handleClick,
    isClicked,
    setIsClicked,
    setScreenSize,
    screenSize
  } = useStateContext();

  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);

    window.addEventListener('resize', handleResize);

    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [setScreenSize]);

  useEffect(() => {
    if (screenSize <= 900) {
      setActiveMenu(false);
    } else {
      setActiveMenu(true);
    }
  }, [screenSize, setActiveMenu]);

  const handleActiveMenu = () => setActiveMenu(!activeMenu);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Add this function to properly close the user profile dropdown
  const closeUserProfile = () => {
    setIsClicked({ ...isClicked, userProfile: false });
  };

  return (
    <div className="flex justify-between p-2 md:ml-6 md:mr-6 relative">
      <NavButton
        title="Menu"
        customFunc={handleActiveMenu}
        color={currentColor}
        icon={<AiOutlineMenu />}
      />
      <div className="flex">
        {/* Other navbar buttons can be added here if needed */}

        <TooltipComponent content="Profile" position="BottomCenter">
          <div
            className="flex items-center gap-2 cursor-pointer p-1 hover:bg-light-gray rounded-lg"
            onClick={() => handleClick('userProfile')}
          >
            {isSignedIn && user ? (
              <>
                <img
                  className="rounded-full w-8 h-8"
                  src={user.imageUrl || avatar}
                  alt="user profile"
                />
                <p>
                  <span className="text-gray-400 text-14">Hi,</span>{' '}
                  <span className="text-gray-400 font-bold ml-1 text-14">
                    {user.firstName || user.fullName || 'User'}
                  </span>
                </p>
                <MdKeyboardArrowDown className="text-gray-400 text-14" />
              </>
            ) : (
              <>
                <img
                  className="rounded-full w-8 h-8"
                  src={avatar}
                  alt="user profile"
                />
                <p>
                  <span className="text-gray-400 text-14">Hi,</span>{' '}
                  <span className="text-gray-400 font-bold ml-1 text-14">
                    Guest
                  </span>
                </p>
                <MdKeyboardArrowDown className="text-gray-400 text-14" />
              </>
            )}
          </div>
        </TooltipComponent>

        {isClicked.userProfile && (
          <div className="nav-item absolute right-1 top-16 bg-white dark:bg-[#42464D] p-8 rounded-lg w-96">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-lg dark:text-gray-200">User Profile</p>
              <button
                type="button"
                onClick={closeUserProfile}
                className="text-xl rounded-full p-3 hover:bg-light-gray dark:hover:bg-gray-700 block"
              >
                <MdOutlineCancel />
              </button>
            </div>
            <div className="flex gap-5 items-center mt-6 border-color border-b-1 pb-6">
              <img
                className="rounded-full h-24 w-24"
                src={user?.imageUrl || avatar}
                alt="user-profile"
              />
              <div>
                <p className="font-semibold text-xl dark:text-gray-200">{user?.fullName || 'User'}</p>
                <p className="text-gray-500 text-sm dark:text-gray-400">{user?.primaryEmailAddress?.emailAddress || 'Company Name'}</p>
                <p className="text-gray-500 text-sm font-semibold dark:text-gray-400">{user?.primaryEmailAddress?.emailAddress || 'user@company.com'}</p>
              </div>
            </div>

            <div>
              <Link
                to="/account-settings"
                className="flex items-center gap-5 border-b-1 border-color p-4 hover:bg-light-gray cursor-pointer dark:hover:bg-[#42464D]"
                onClick={closeUserProfile}
              >
                <button
                  type="button"
                  style={{ color: '#03C9D7', backgroundColor: '#E5FAFB' }}
                  className="text-xl rounded-lg p-3 hover:bg-light-gray"
                >
                  <FiShoppingCart />
                </button>
                <div>
                  <p className="font-semibold dark:text-gray-200">Account Settings</p>
                  <p className="text-gray-500 text-sm dark:text-gray-400">Manage your profile</p>
                </div>
              </Link>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{ backgroundColor: currentColor, color: 'white', borderRadius: '10px' }}
                  className="w-full p-2.5 text-sm font-semibold"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;