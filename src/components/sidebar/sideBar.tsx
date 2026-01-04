// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState } from "react";

import { SidebarButton } from "../Buttons/SidebarButton";
import { SidebarGridButton } from "../Buttons/SidebarGridButton";
import { SyncIndicatorCompact } from "../ui/SyncIndicator";

import { IoSettingsSharp } from "react-icons/io5";
import { IoIosAdd } from "react-icons/io";
import { IoSunny, IoGrid, IoAlert, IoCheckmarkDone } from "react-icons/io5";
import { GoHash } from "react-icons/go";

import { IoIosArrowUp } from "react-icons/io";
import { IoAdd } from "react-icons/io5";

import { PiSidebarSimpleLight } from "react-icons/pi";
import { IoIosNotificationsOutline } from "react-icons/io";

import { Tabs } from "../../App";

interface sideBarProps {
  onTabSwitch: (newTab: string) => void;
  currentTab: string;
  onOpenSettings: () => void;
  onOpenCreateTask: () => void;
}

const HorizontalDivider = ()=> {
  return <div className="w-full h-px my-2 bg-gray-200 dark:bg-neutral-600" />
}

function SideBar({ onTabSwitch, currentTab, onOpenSettings, onOpenCreateTask }: sideBarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [iconSize] = useState(18);



  return (
    <aside className={`sticky top-0 bg-[#f3f3f3] dark:bg-[#202020] h-dvh [html.os-macos_&]:pt-6 pt-2 px-3 self-start col-span-1 space-y-2 transition-[width] duration-300 ease-in-out` + (isOpen ? " w-sm" : " w-14")}>
      <header className="flex-row w-full flex justify-between items-center">
        {/** USER INFO **/}
        <button
          className={`${ isOpen ? "flex" : "hidden" } undraggable flex flex-row justify-start items-center w-full`}
          onClick={() => console.log("clicked")} // Open Taskly+ link
        >
          <img
            className="rounded-full w-8 h-8 aspect-square"
            src="https://picsum.photos/50/50"
          />
          <div className={isOpen ? `flex flex-col my-1 ml-2 items-start` : `hidden`}>
            <p className="text-sm h-fit font-bold">Oliver</p>
            <p className="text-xs text-gray-500 font-medium">
              Premium+
            </p>
          </div>
        </button>

        <button
          className={`${ isOpen ? "flex" : "hidden" } group cursor-pointer aspect-square w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-200/40 transition-colors`}
        >
          <IoIosNotificationsOutline
            className="text-gray-600 transition-transform duration-200"
            size={20}
          />
        </button>

        <button
          className="group cursor-pointer aspect-square w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-200/40 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <PiSidebarSimpleLight
            className={`text-gray-600 transition-transform duration-200`}
            size={20}
          />
        </button>
      </header>

      <button
          className={`${!isOpen ? "justify-center" : "justify-start"} cursor-pointer flex w-full items-center gap-2 rounded-lg px-2.5 py-2 border border-dashed border-neutral-300 dark:border-neutral-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-neutral-500 dark:text-neutral-400 hover:text-blue-500 dark:hover:text-blue-400 font-medium text-sm transition-all duration-200`}
          onClick={onOpenCreateTask}
      >
        <IoIosAdd size={18} className="flex-shrink-0" />
        {isOpen && <span>Add Task</span>}
      </button>
        
      <ul className="select-none w-full">

        <HorizontalDivider />

        <div className={`grid ${isOpen ? "grid-cols-2" : "grid-cols-1"} ease-in-out transition-all gap-2`}>
          <SidebarGridButton
            icon={<IoSunny size={iconSize} />}
            label="Today"
            color="purple"
            tabKey={Tabs.home}
            currentTab={currentTab}
            isMenuOpen={isOpen}
            onClick={() => onTabSwitch(Tabs.home)}
            />
          <SidebarGridButton
            icon={<IoGrid size={iconSize} />}
            label="All"
            color="blue"
            tabKey={Tabs.tasks}
            currentTab={currentTab}
            isMenuOpen={isOpen}
            onClick={() => onTabSwitch(Tabs.tasks)}
          />
          <SidebarGridButton
            icon={<IoAlert size={iconSize} />}
            label="Overdue"
            color="green"
            tabKey={Tabs.completed}
            currentTab={currentTab}
            isMenuOpen={isOpen}
            onClick={() => onTabSwitch(Tabs.completed)}
          />
          <SidebarGridButton
            icon={<IoCheckmarkDone size={iconSize} />}
            label="Completed"
            color="yellow"
            tabKey={Tabs.completed}
            currentTab={currentTab}
            isMenuOpen={isOpen}
            onClick={() => onTabSwitch(Tabs.completed)}
          />
        </div>

        <HorizontalDivider />

      
        { isOpen && 
        <div>
          {/* Projects Header */}
          <div className="flex items-center justify-between group">
            <button
              onClick={() => setIsProjectsOpen(!isProjectsOpen)}
              className="flex-1 flex items-center gap-2 py-1.5 text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              <IoIosArrowUp 
                size={12} 
                className={`transition-transform duration-200 ${isProjectsOpen ? "rotate-0" : "rotate-180"}`}
              />
              <span>My Projects</span>
            </button>
            <button
              onClick={() => console.log("Add new project")}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-all duration-150"
            >
              <IoAdd size={16} />
            </button>
          </div>

          {/* Projects List */}
          <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isProjectsOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="pl-3 border-l-2 border-neutral-200 dark:border-neutral-700 space-y-0.5">
              <SidebarButton
                icon={<GoHash color="#6366f1" size={iconSize} />}
                label="Work"
                color="blue"
                tabKey={Tabs.notes}
                currentTab={currentTab}
                isMenuOpen={isOpen}
                onClick={() => onTabSwitch(Tabs.notes)}
              />

              <SidebarButton
                icon={<GoHash color="#f59e0b" size={iconSize} />}
                label="University Project"
                color="blue"
                tabKey={Tabs.notes}
                currentTab={currentTab}
                isMenuOpen={isOpen}
                onClick={() => onTabSwitch(Tabs.notes)}
              />

              <SidebarButton
                icon={<GoHash color="#10b981" size={iconSize} />}
                label="Personal"
                color="blue"
                tabKey={Tabs.notes}
                currentTab={currentTab}
                isMenuOpen={isOpen}
                onClick={() => onTabSwitch(Tabs.notes)}
              />

              <SidebarButton
                icon={<GoHash color="#ec4899" size={iconSize} />}
                label="Side Projects"
                color="blue"
                tabKey={Tabs.notes}
                currentTab={currentTab}
                isMenuOpen={isOpen}
                onClick={() => onTabSwitch(Tabs.notes)}
              />

              <SidebarButton
                icon={<GoHash color="#8b5cf6" size={iconSize} />}
                label="Learning"
                color="blue"
                tabKey={Tabs.notes}
                currentTab={currentTab}
                isMenuOpen={isOpen}
                onClick={() => onTabSwitch(Tabs.notes)}
              />
            </div>
          </div>
        </div> 
        }

        <HorizontalDivider />

        <div className="absolute bottom-0 left-0 w-full flex flex-col px-3 pb-2 space-y-1">
          <SyncIndicatorCompact isExpanded={isOpen} />
          <SidebarButton
            icon={<IoSettingsSharp size={iconSize} />}
            label="Settings"
            color="blue"
            tabKey="settings"
            currentTab=""
            isMenuOpen={isOpen}
            onClick={onOpenSettings}
          />
        </div>
        
      </ul>
    </aside>
  );
}

export default SideBar;
