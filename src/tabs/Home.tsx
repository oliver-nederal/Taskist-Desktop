// eslint-disable-next-line @typescript-eslint/no-unused-vars
import TaskList from "../components/tasks/TaskList";

function Home() {
  function getCurrentDate() {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    return new Date().toLocaleDateString(undefined, options);
  }

  return (
    <div className="h-full w-full flex flex-col space-y-2 text-black dark:text-neutral-200">
      <div className="z-10 w-full flex sticky top-0 flex-row space-x-5 p-5 items-center justify-between select-none">
        <h1 className="text-3xl font-bold">{getCurrentDate()}</h1>
      </div>

      <div className="flex flex-col gap-4 px-5 min-h-96">
        <h2 className="font-bold">Overdue</h2>
        <TaskList maxTasks={5} />
      </div>
    </div>
  );
}

export default Home;
