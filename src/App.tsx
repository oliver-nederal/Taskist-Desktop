// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState } from "react";
import "./App.css";

import SideBar from "./components/sideBar";
import SyncIndicator from "./components/SyncIndicator";
import Home from "./tabs/Home";
import Tasks from "./tabs/Tasks";
import Notes from "./tabs/Notes";
import Settings from "./tabs/Settings";

export enum Tabs {
  home = "home",
  tasks = "tasks",
  notes = "notes",
  settings = "settings"
}

function App() {
  const [tab, setTab] = useState<string>(Tabs.home);

  const getTab = () => {
    switch (tab) {
      case Tabs.home:
        return <Home />;
      case Tabs.tasks:
        return <Tasks />;
      case Tabs.notes:
        return <Notes />;
      case Tabs.settings:
        return <Settings />;
      default:
        return <Home />;
    }
  };

  const handleTabSwitch = (newTab: string) => setTab(newTab);

  return (
    <div className="font-taskly min-h-screen flex flex-row antialiased mac">
      <div data-tauri-drag-region className="fixed w-screen h-8 bg-red-100/50 z-50" />

      <SideBar onTabSwitch={handleTabSwitch} currentTab={tab} />
      <div className="pb-2 pt-2 pr-2 bg-[#dcdcdc] h-screen w-full">
        {getTab()}
      </div>
      <SyncIndicator />
    </div>
  );
}

export default App;
