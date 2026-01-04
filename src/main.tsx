import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import DatePickerPopup from "./components/popups/DatePickerPopup";

import "./App.css";

import {TasksProvider} from "./context/TasksContext";

// Check if we're in a popup window
const isDatePickerPopup = window.location.pathname.startsWith("/popup/datepicker");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isDatePickerPopup ? (
      <DatePickerPopup />
    ) : (
      <TasksProvider>
        <App />
      </TasksProvider>
    )}
  </React.StrictMode>,
);
