// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState } from "react";

import TaskList from "../components/tasks/TaskList";
import { BsThreeDots } from "react-icons/bs";

function Completed() {
  const [numTasks, setNumTasks] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Function to handle refreshing tasks without recreating the component
  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="bg-white rounded-lg pt-6 h-full w-full flex flex-col space-y-2">
      <div className="pb-2 px-6 z-10 flex sticky top-0 flex-row space-x-5 items-center select-none bg-opacity-90">
        <h1 className="text-3xl font-bold">Completed</h1>
        <hr className="h-full w-px bg-gray-300" />
        <div className="flex flex-row w-full items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">{numTasks}</h1>
            <p>
              Unfinished Task
              {numTasks ? "s" : ""}
              {numTasks == 0 ? ", Woohoo 🥳!" : ""}
            </p>
          </div>
          <button
            className="undraggable bg-gray-600 backdrop-blur-sm bg-opacity-10 px-2 py-1 rounded-md"
            onClick={handleRefresh}
          >
            <BsThreeDots className="fill-gray-600" size={16} />
          </button>
        </div>
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

export default Completed;
