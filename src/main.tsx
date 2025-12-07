import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./api";
import "./App.css";

import {TasksProvider} from "./context/TasksContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TasksProvider>
      <App />
    </TasksProvider>
  </React.StrictMode>,
);
