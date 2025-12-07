// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState } from "react";
import { IoSettingsSharp } from "react-icons/io5";
import { IoIosSunny, IoIosArrowBack, IoIosAdd } from "react-icons/io";
import { BsListTask } from "react-icons/bs";
import { FaClipboardList } from "react-icons/fa";
import { RiFilePaper2Fill } from "react-icons/ri";
import { Tabs } from "../App";

interface sideBarProps {
  onTabSwitch: (newTab: string) => void;
  currentTab: string;
}

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  tabKey: string;
  currentTab: string;
  isMenuOpen?: boolean;
  onClick: () => void;
}

const SidebarGridButton = ({
  icon,
  label,
  color,
  tabKey,
  currentTab,
  isMenuOpen,
  onClick
}: SidebarButtonProps) => {
  const isActive = currentTab === tabKey;
  
  // Map color strings to actual Tailwind classes
  const bgColorClass = {
    red: 'bg-red-300',
    blue: 'bg-blue-300',
    green: 'bg-green-300',
    yellow: 'bg-yellow-300',
    purple: 'bg-purple-300',
    pink: 'bg-pink-300',
    orange: 'bg-orange-300',
  }[color] || 'bg-gray-300';
  
  return (
    <button
      onClick={onClick}
      className={`cursor-default h-18 rounded-lg text-sm p-2 grid grid-cols-2 grid-rows-2 w-full transition-all ease-in-out duration-150 
        ${isActive ? "bg-neutral-400/40 text-black" : "bg-neutral-300 text-gray-700"
        }`}
    >
      <span className={`grid item-center justify-center ${bgColorClass} rounded-full p-1 h-full aspect-square`}>{icon}</span>
      <span className="row-span-2 flex justify-end items-start w-full h-full">1</span>
      {isMenuOpen ? <span className="flex justify-end items-end">{label}</span> : null}
    </button>
  );
};

const SidebarButton = ({
  icon,
  label,
  tabKey,
  currentTab,
  isMenuOpen,
  onClick
}: SidebarButtonProps) => {
  const isActive = currentTab === tabKey;
  return (
    <button
      onClick={onClick}
      className={`cursor-default text-sm px-3 py-1 flex items-center w-full transition-all ease-in-out duration-150 ${
        isActive ? "bg-gray-300 text-black" : "bg-transparent text-gray-700"
      }`}
    >
      <span className={`flex item-center justify-center` + (isMenuOpen ? " mr-3" : " h-8")}>{icon}</span> {isMenuOpen ? label : null}
    </button>
  );
};

function SideBar({ onTabSwitch, currentTab }: sideBarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [iconSize] = useState(16);

  return (
    <div className={`sticky top-0 bg-[#dcdcdc] h-dvh py-6 self-start col-span-1 transition-all duration-150 ease-in-out` + (isOpen ? " w-80" : " w-12")}>
      <ul className="select-none w-full">
        {/** USER INFO **/}
        <button
          className="px-2 undraggable flex flex-row justify-start items-center w-full"
          onClick={() => console.log("clicked")} // Open Taskly+ link
        >
          <img
            className="rounded-full w-8 h-8 aspect-square"
            src="https://picsum.photos/50/50"
          />
          <div className={isOpen ? `flex flex-col my-1 items-start` : `hidden`}>
            <p className="ml-3 text-sm font-medium">Click Here</p>
            <p className="ml-3 text-sm text-gray-500 font-medium">
              to setup Taskly+
            </p>
          </div>
        </button>
        {/** USER INFO **/}

        <div className="w-full h-px my-4 bg-gray-300" />

        <div className={`grid ${isOpen ? "grid-cols-2" : "grid-cols-1"} ease-in-out transition-all gap-2 px-2`}>
          <SidebarGridButton
            icon={<IoIosSunny size={iconSize} />}
            label="Today"
            color="red"
            tabKey={Tabs.home}
            currentTab={currentTab}
            isMenuOpen={isOpen}
            onClick={() => onTabSwitch(Tabs.home)}
            />
          <SidebarGridButton
            icon={<FaClipboardList size={iconSize} />}
            label="Tasks"
            color="blue"
            tabKey={Tabs.tasks}
            currentTab={currentTab}
            isMenuOpen={isOpen}
            onClick={() => onTabSwitch(Tabs.tasks)}
          />
          <SidebarGridButton
            icon={<RiFilePaper2Fill size={iconSize} />}
            label="Notes"
            color="green"
            tabKey={Tabs.notes}
            currentTab={currentTab}
            isMenuOpen={isOpen}
            onClick={() => onTabSwitch(Tabs.notes)}
            />
        </div>

        <div className="w-full h-px my-4 bg-gray-300" />

        <SidebarButton
          icon={<BsListTask size={iconSize} />}
          label="Custom List 1"
          color="blue"
          tabKey={Tabs.notes}
          currentTab={currentTab}
          isMenuOpen={isOpen}
          onClick={() => onTabSwitch(Tabs.notes)}
        />

        <SidebarButton
          icon={<BsListTask size={iconSize} />}
          label="Custom List 2"
          color="blue"
          tabKey={Tabs.notes}
          currentTab={currentTab}
          isMenuOpen={isOpen}
          onClick={() => onTabSwitch(Tabs.notes)}
        />

        <SidebarButton
          icon={<BsListTask size={iconSize} />}
          label="Custom List 3"
          color="blue"
          tabKey={Tabs.notes}
          currentTab={currentTab}
          isMenuOpen={isOpen}
          onClick={() => onTabSwitch(Tabs.notes)}
        />

        <SidebarButton
          icon={<BsListTask size={iconSize} />}
          label="Custom List 4"
          color="blue"
          tabKey={Tabs.notes}
          currentTab={currentTab}
          isMenuOpen={isOpen}
          onClick={() => onTabSwitch(Tabs.notes)}
        />

        <SidebarButton
          icon={<BsListTask size={iconSize} />}
          label="Custom List 5"
          color="blue"
          tabKey={Tabs.notes}
          currentTab={currentTab}
          isMenuOpen={isOpen}
          onClick={() => onTabSwitch(Tabs.notes)}
        />

        <div className="w-full h-px my-4 bg-gray-300" />

        <SidebarButton
          icon={<IoSettingsSharp size={iconSize} />}
          label="Settings"
          color="blue"
          tabKey={Tabs.settings}
          currentTab={currentTab}
          isMenuOpen={isOpen}
          onClick={() => onTabSwitch(Tabs.settings)}
        />

        <div className="absolute flex flex-row justify-between bottom-0 left-0 w-full h-12 p-2 items-center">
          <button className="cursor-default flex flex-row w-full h-full text-sm aspect-square rounded-md items-center justify-start">
            <IoIosAdd className="fill-gray-600" size={22} />
            {isOpen && <input type="text" placeholder="New List" className="border-b w-24 border-gray-300 focus:outline-none" />}
          </button>
          <button
            className="group cursor-default w-6 p-2 rounded-md justify-center items-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            <IoIosArrowBack className={`fill-gray-600 transition-transform duration-200 ${!isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </ul>
    </div>
  );
}

export default SideBar;
