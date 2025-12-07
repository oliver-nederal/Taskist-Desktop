// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState } from "react";
import { MdDeleteForever } from "react-icons/md";
import { IoMdCalendar } from "react-icons/io";
import type { Task } from "../db";

interface CheckboxProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (deletedTask: Task) => void;
  isSelected: boolean;
  onSelect: () => void;
  animation: boolean;
}

function Checkbox({
  task,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
  animation
}: CheckboxProps) {
  const [showModal, setShowModal] = useState<boolean>(false);

  return (
    <li
      className={`inline-flex items-center justify-between w-full rounded-lg cursor-pointer transition-all duration-150 ease-in-out peer-checked:bg-gray-100
        peer-checked:text-gray-100 ${isSelected ? "bg-blue-50" : "bg-white hover:bg-gray-50"} `}
    >
      <button
        onClick={onSelect}
        onDoubleClick={() => {
          setShowModal(!showModal);
        }}
        className="w-full flex flex-row items-center p-1"
      >
        <div className="flex flex-row items-center space-x-2">
          {/* Checkbox with centered checkmark SVG */}
          <span className="relative inline-block h-4 w-4 shrink-0">
            <input
              type="checkbox"
              className="peer appearance-none border border-[#b2b2b2] focus:ring-3 focus:ring-green-300 h-[18px] w-[18px] rounded-full cursor-pointer checked:bg-green-500/50 checked:border-green-600 transition-all duration-150 ease-in-out"
              checked={task.completed}
              onClick={() => {
                onUpdate({
                  ...task,
                  completed: !task.completed
                });
              }}
              onChange={() => {}}
            />
            {/* Visible only when checked */}
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity duration-150 ease-in-out text-green-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              focusable="false"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>

          <div className="select-none flex flex-col">
            <label
              className={`relative text-gray-700 select-none line-clamp-1 ${!animation && task.completed ? "line-through" : ""}`}
            >
              {task.title}
              {animation ? (
                <span
                  className={`absolute left-0 bottom-[45%] w-full h-px bg-black ${task.completed ? "transform -translate-x-[0%] transition-all duration-500 w-0" : "transform -translate-x-[100%] transition-all duration-500 max-w-full"} `}
                />
              ) : null}
            </label>
            {task.title == "forgothomework" ? (
              <div className="flex flex-row items-center space-x-1 text-red-600">
                <p className="text-sm text-gray-500">1 of 3</p>
                <div className="bg-gray-600 w-1 h-1 rounded-full"></div>
                <IoMdCalendar />
                <p className="text-sm">Yesterday</p>
              </div>
            ) : null}
          </div>
        </div>
      </button>
      {showModal ? (
        <aside className="grid place-content-center w-screen h-screen fixed top-0 left-0 z-10">
          <div
            className="w-screen h-screen fixed top-0 left-0 z-10 bg-gray-300 opacity-70"
            onClick={() => setShowModal(!showModal)}
          />
          <div className="bg-white text-black cursor-auto z-20 w-screen-3/4 h-screen-3/4 rounded-md shadow-md p-2">
            <div className="inline-flex items-center justify-between w-full p-1">
              <h2 className="text-2xl w-1/2 line-clamp-1 relative">
                {task.title}
                <span className="hidden z-30 bg-gray-500 text-white text-center px-1 rounded-md absolute hover:visible">
                  {task.title}
                </span>
              </h2>
              <MdDeleteForever
                className="w-6 h-6 cursor-pointer hover:fill-gray-600"
                onClick={() => {
                  setShowModal(false);
                  setTimeout(() => onDelete(task), 50);
                }}
              />
            </div>
            <hr className="w-full h-px bg-gray-300" />
          </div>
        </aside>
      ) : null}
    </li>
  );
}

export default Checkbox;
