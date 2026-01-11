// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState } from "react";

import TaskList from "../components/tasks/TaskList";
import { BsThreeDots } from "react-icons/bs";

function Tasks() {
  const [numTasks, setNumTasks] = useState<number>(0);
  // Remove the checklistKey state since we don't need it anymore
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Function to handle refreshing tasks without recreating the component
  const handleRefresh = () => {
    // Just increment the refreshTrigger to force a data reload
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="rounded-lg pt-6 h-full w-full flex flex-col space-y-2 text-black dark:text-neutral-200">
      {/* Improved Header Section */}
    <div className="pb-2 px-6 z-10 sticky top-0 flex items-baseline gap-3 select-none bg-opacity-90">
      <h1 className="text-3xl font-bold text-black dark:text-white">Tasks</h1>
      
      <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        <span className="font-bold text-lg mr-1">
          {numTasks}
        </span>
        Unfinished Task{numTasks !== 1 ? "s" : ""}
        {numTasks === 0 && ", Woohoo 🥳!"}
      </p>
    </div>

      <TaskList
        animation={true}
        isTaskPage={true}
        input={true}
        setTaskNum={setNumTasks}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}

export default Tasks;
