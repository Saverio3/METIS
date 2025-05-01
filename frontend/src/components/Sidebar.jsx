import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SiShopware } from 'react-icons/si';
import { MdOutlineCancel } from 'react-icons/md';
import { TooltipComponent } from '@syncfusion/ej2-react-popups';
import { FiHome, FiUploadCloud, FiTool, FiSettings, FiFolder, FiCheckSquare, FiBarChart2, FiLayers, FiPieChart, FiActivity, FiEdit } from 'react-icons/fi';
import { AiOutlineCalendar, AiOutlineBlock } from 'react-icons/ai';
import { PiBezierCurve } from "react-icons/pi";
import { BsKanban } from 'react-icons/bs';
import { GoTasklist } from "react-icons/go";
import { IoMdContacts } from 'react-icons/io';
import { RiContactsLine, RiStockLine } from 'react-icons/ri';

import { useStateContext } from '../contexts/ContextProvider';

const Sidebar = () => {
  const { currentColor, activeMenu, setActiveMenu, screenSize } = useStateContext();

  const handleCloseSideBar = () => {
    if (activeMenu !== undefined && screenSize <= 900) {
      setActiveMenu(false);
    }
  };

  const activeLink = 'flex items-center gap-5 pl-4 pt-3 pb-2.5 rounded-lg text-white text-md m-2';
  const normalLink = 'flex items-center gap-5 pl-4 pt-3 pb-2.5 rounded-lg text-md text-gray-700 dark:text-gray-200 dark:hover:text-black hover:bg-light-gray m-2';

  // Define our navigation links
  const links = [
    /* {
      title: 'Dashboard',
      links: [
        { name: 'ecommerce', icon: <FiHome /> },
      ],
    }, */
    {
      title: 'Data Management',
      links: [
        { name: 'data-upload', icon: <FiUploadCloud /> },
        { name: 'variable-workshop', icon: <FiTool /> },
        { name: 'variable-charts', icon: <FiPieChart /> },
      ],
    },
    {
      title: 'Modeling',
      links: [
        { name: 'model-library', icon: <FiFolder /> },
        { name: 'model-builder', icon: <FiSettings /> },
        { name: 'variable-testing', icon: <FiCheckSquare /> },
        { name: 'curve-testing', icon: <PiBezierCurve /> },
      ],
    },
    {
      title: 'Analysis',
      links: [
        { name: 'decomposition', icon: <FiBarChart2 /> },
        { name: 'contribution-groups', icon: <FiLayers /> },
        { name: 'model-diagnostics', icon: <FiActivity /> },
      ],
    },
    {
      title: 'Apps',
      links: [
        { name: 'calendar', icon: <AiOutlineCalendar /> },
        { name: 'kanban', icon: <GoTasklist /> },
        // { name: 'editor', icon: <FiEdit /> },
        // { name: 'color-picker', icon: <FiEdit /> },
      ],
    },
    /* {
      title: 'Pages',
      links: [
        { name: 'orders', icon: <RiStockLine /> },
        { name: 'employees', icon: <IoMdContacts /> },
        { name: 'customers', icon: <RiContactsLine /> },
      ],
    }, */
  ];

  return (
    <div className="ml-3 h-screen md:overflow-hidden overflow-auto md:hover:overflow-auto pb-10">
      {activeMenu && (
        <>
          <div className="flex justify-between items-center">
            <Link to="/" onClick={handleCloseSideBar} className="items-center gap-3 ml-3 mt-4 flex text-xl font-extrabold tracking-tight dark:text-white text-slate-900">
              <SiShopware /> <span>METIS MMM</span>
            </Link>
            <TooltipComponent content="Menu" position="BottomCenter">
              <button
                type="button"
                onClick={() => setActiveMenu(!activeMenu)}
                style={{ color: currentColor }}
                className="text-xl rounded-full p-3 hover:bg-light-gray mt-4 block md:hidden"
              >
                <MdOutlineCancel />
              </button>
            </TooltipComponent>
          </div>
          <div className="mt-10 ">
            {links.map((item) => (
              <div key={item.title}>
                <p className="text-gray-400 dark:text-gray-400 m-3 mt-4 uppercase">
                  {item.title}
                </p>
                {item.links.map((link) => (
                  <NavLink
                    to={`/${link.name}`}
                    key={link.name}
                    onClick={handleCloseSideBar}
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? currentColor : '',
                    })}
                    className={({ isActive }) => (isActive ? activeLink : normalLink)}
                  >
                    {link.icon}
                    <span className="capitalize ">{link.name.replace(/-/g, ' ')}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
