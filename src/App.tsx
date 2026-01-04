import { useEffect, useState } from "react";
import { platform } from "@tauri-apps/plugin-os";
import { getCurrentWindow } from "@tauri-apps/api/window";

import "./App.css";

import Onboarding from "./components/Onboarding";

import SideBar from "./components/sidebar/sideBar";
import Home from "./tabs/Home";
import Tasks from "./tabs/Tasks";
import Completed from "./tabs/Completed";
import SettingsModal from "./components/settings/SettingsModal";
import CreateTaskModal from "./components/tasks/CreateTaskModal";

export enum Tabs {
  home = "home",
  tasks = "tasks",
  completed = "completed",
  notes = "notes"
}

function App() {
  const [tab, setTab] = useState<string>(Tabs.home);
  const [onboarding, setOnboarding] = useState<boolean>(false);
  const [osName, setOsName] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCreateTask, setShowCreateTask] = useState<boolean>(false);

  //absolutely nuclear option to avoid stupid windows theming
  useEffect(() => {
    const win = getCurrentWindow();

    const applyTheme = (theme: "dark" | "light") => {
      document.documentElement.classList.remove("dark");
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      }
    };

    let unlisten: (() => void) | undefined;

    (async () => {
      // initial theme
      const theme = await win.theme();
      applyTheme(theme);

      // future changes
      unlisten = await win.onThemeChanged(({ payload }) => {
        applyTheme(payload);
      });
    })();

    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    async function getOS() {
      try {
        const os = await platform(); 
        const osClass = `os-${os}`;
        document.documentElement.classList.add(osClass);
        setOsName(os);
      } catch (error) {
        console.error("Failed to get OS platform:", error);
      }
    }

    getOS();

    const mainWindow = getCurrentWindow();
    const applyTheme = (theme: string | null) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mainWindow.theme().then(applyTheme).catch(console.error);
    const unlistenPromise = mainWindow.onThemeChanged(({ payload: newTheme }) => {
      applyTheme(newTheme);
    });

    return () => {
      unlistenPromise.then(unlistenFn => unlistenFn());
    };
  }, []);

  const getTab = () => {
    switch (tab) {
      case Tabs.home:
        return <Home />;
      case Tabs.tasks:
        return <Tasks />;
      case Tabs.completed:
        return <Completed />;
      default:
        return <Home />;
    }
  };

  const handleTabSwitch = (newTab: string) => {
    setTab(newTab);
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleOpenCreateTask = () => {
    setShowCreateTask(true);
  };

  return (
    <div className="font-taskly min-h-screen flex flex-row antialiased mac"> 
      { osName === 'macos' && <div data-tauri-drag-region className="fixed w-screen h-8 z-50 bg-red-500" />}
      { onboarding && <Onboarding /> }

      <SideBar onTabSwitch={handleTabSwitch} currentTab={tab} onOpenSettings={handleOpenSettings} onOpenCreateTask={handleOpenCreateTask} />
      <div className="pb-2 [html.os-macos_&]:pt-2 pr-2 bg-[#f3f3f3] dark:bg-[#202020] h-screen w-full">
        <div className="w-full h-full dark:bg-zinc-900 bg-neutral-50 rounded-lg">
          {getTab()}
        </div>
      </div>
      
      {/* Modals */}
      <CreateTaskModal isOpen={showCreateTask} onClose={() => setShowCreateTask(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default App;
