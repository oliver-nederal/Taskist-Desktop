// eslint-disable-next-line @typescript-eslint/no-unused-vars
import CheckboxList from "../components/checkboxList";
import { IoPencil } from "react-icons/io5";

import laurel from "../assets/laurel.svg";

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
    <div className="bg-white rounded-lg h-full w-full flex flex-col space-y-2">
      <div className="z-10 w-full flex sticky top-0 flex-row space-x-5 p-5 items-center justify-between select-none">
        <h1 className="text-3xl font-bold">{getCurrentDate()}th</h1>
        <button className="text-sm opacity-40 cursor-pointer"> <IoPencil className="inline-block" /> Edit Homepage</button>
      </div>

      <div className="grid grid-cols-3 grid-rows-3 gap-4 px-5 h-full">
        <div className="bg-blue-100 border border-gray-400 rounded-2xl w-full h-full flex flex-col justify-between items-end p-4">
          <p className="text-sm">This week you have completed</p>

          <div className="flex flex-row items-end">
            <h2 className="text-6xl font-medium opacity-80">15</h2>
            <p className="font-medium">tasks</p>
          </div>
        </div>
        <div className="bg-green-300/80 border border-gray-400 rounded-2xl w-full h-full flex flex-col justify-between items-end p-4">
          <p className="text-sm">This week you have</p>

          <div className="flex flex-row items-end">
            <h2 className="text-6xl font-medium opacity-80">3</h2>
            <p className="font-medium">tasks</p>
          </div>
        </div>
        <div className="border-gray-400 bg-yellow-300/80 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border rounded-2xl w-full h-full flex flex-col justify-center items-center p-4">
          <p className="font-medium">Level Progress</p>
          <div className="flex flex-row items-center justify-center">
            <img src={laurel} alt="laurel" className="h-10 rotate-30 w-8 opacity-40" />
            <h2 className="text-6xl font-medium opacity-80">100</h2>
            <img src={laurel} alt="laurel" className="h-10 rotate-330 w-8 opacity-40 scale-x-[-1]" />
          </div>
          <p className="text-sm">240 XP</p>
          <p className="text-sm">Level 3</p>
        </div>

        <div className="col-span-3 row-span-2">
          <CheckboxList maxTasks={5} />
        </div>
      </div>
    </div>
  );
}

export default Home;
