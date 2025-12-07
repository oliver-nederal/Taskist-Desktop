// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState, useEffect } from "react";
import { getSyncSettings, saveSyncSettings, type SyncSettings } from "../utils/secureStorage";
import { useTasks } from "../context/TasksContext";
import PouchDB from "pouchdb";

function Settings() {
  const { restartSync } = useTasks();
  const [activeTab, setActiveTab] = useState<string>("Sync");
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(getSyncSettings());
  const [testStatus, setTestStatus] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof SyncSettings, string>>>({});
  // Appearance preview states
  const [textSize, setTextSize] = useState<number>(1);
  // Taskly+ toggle (UI only for now)
  const [tasklyPlus, setTasklyPlus] = useState<boolean>(false);

  // Load settings on mount
  useEffect(() => {
    setSyncSettings(getSyncSettings());
  }, []);

  // Validate a single field
  const validateField = (key: keyof SyncSettings, value: string): string => {
    switch (key) {
      case "syncUrl":
        if (!value.trim()) return "Server URL is required";
        if (value.includes(" ")) return "URL cannot contain spaces";
        return "";
      
      case "syncUsername":
        if (!value.trim()) return "Username is required";
        if (value.length < 2) return "Username must be at least 2 characters";
        return "";
      
      case "syncPassword":
        if (!value.trim()) return "Password is required";
        if (value.length < 3) return "Password must be at least 3 characters";
        return "";
      
      case "syncDbName":
        if (!value.trim()) return "Database name is required";
        if (!/^[a-z][a-z0-9_$()+/-]*$/.test(value)) {
          return "Database name must start with lowercase letter and contain only lowercase letters, digits, and _$()+/-";
        }
        return "";
      
      default:
        return "";
    }
  };

  // Update local state and validate
  const handleSyncChange = (key: keyof SyncSettings, value: string) => {
    setSyncSettings({ ...syncSettings, [key]: value });
    
    // Validate on change
    const error = validateField(key, value);
    setValidationErrors(prev => ({
      ...prev,
      [key]: error
    }));
  };

  // Validate all sync settings
  const validateAllSettings = (): boolean => {
    const errors: Partial<Record<keyof SyncSettings, string>> = {};
    let isValid = true;

    (Object.keys(syncSettings) as Array<keyof SyncSettings>).forEach(key => {
      const error = validateField(key, syncSettings[key]);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  // Save and validate sync settings - combines save and test into one
  const handleSaveAndValidate = async () => {
    if (!validateAllSettings()) {
      setTestStatus("⚠ Please fix validation errors before saving");
      setTimeout(() => setTestStatus(""), 3000);
      return;
    }

    setIsTesting(true);
    setTestStatus("Validating connection...");
    
    try {
      const normalizedUrl = syncSettings.syncUrl.startsWith("http") 
        ? syncSettings.syncUrl 
        : `http://${syncSettings.syncUrl}`;
      
      const remoteDbUrl = `${normalizedUrl}/${syncSettings.syncDbName}`;
      
      const remote = new PouchDB(remoteDbUrl, {
        auth: syncSettings.syncUsername && syncSettings.syncPassword 
          ? { username: syncSettings.syncUsername, password: syncSettings.syncPassword } 
          : undefined,
      });

      const info = await remote.info();
      console.log("[test] remote DB info:", info);
      
      const snapshot = await remote.allDocs({ include_docs: true, limit: 5 });
      console.log("[test] remote snapshot:", snapshot);
      
      // Only save and restart sync if validation passes
      saveSyncSettings(syncSettings);
      restartSync();
      
      setTestStatus(`✓ Saved & Connected! Database: ${info.db_name}, Docs: ${info.doc_count}`);
      setTimeout(() => setTestStatus(""), 5000);
    } catch (error: any) {
      console.error("[test] connection failed:", error);
      setTestStatus(`✗ Validation failed: ${error.message || String(error)}`);
      setTimeout(() => setTestStatus(""), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  type SettingsCategory = {
    category: string;
    settings: Setting[];
  };

  const settingsConfig: SettingsCategory[] = [
    {
      category: "Sync & Database",
      settings: [
        {
          key: "syncUrl",
          label: "CouchDB Server URL",
          type: "text",
          default: syncSettings.syncUrl,
          placeholder: "e.g., localhost:5984 or https://example.com"
        },
        {
          key: "syncUsername",
          label: "Username",
          type: "text",
          default: syncSettings.syncUsername,
          placeholder: "Database username"
        },
        {
          key: "syncPassword",
          label: "Password",
          type: "password",
          default: syncSettings.syncPassword,
          placeholder: "Database password"
        },
        {
          key: "syncDbName",
          label: "Database Name",
          type: "text",
          default: syncSettings.syncDbName,
          placeholder: "Remote database name"
        }
      ]
    },
    {
      category: "Appearance",
      settings: [
        {
          key: "theme",
          label: "Theme",
          type: "select",
          options: ["light", "dark", "system"],
          default: "light"
        },
        {
          key: "textSize",
          label: "Text Size",
          type: "slider",
          min: 1,
          max: 5,
          step: 1,
          default: 1,
          labels: ["a", "a", "a", "a", "a"] // stage previews (overridden in renderer)
        }
      ]
    },
    {
      category: "Notifications",
      settings: [
        {
          key: "notifications",
          label: "Enable Reminders",
          type: "checkbox",
          default: true
        },
        {
          key: "reminderTime",
          label: "Default Reminder (minutes)",
          type: "number",
          default: 30,
          min: 1
        }
      ]
    },
    {
      category: "Tasks",
      settings: [
        {
          key: "defaultPriority",
          label: "Default Priority",
          type: "select",
          options: ["low", "medium", "high"],
          default: "medium"
        },
        {
          key: "showCompleted",
          label: "Show Completed Tasks",
          type: "checkbox",
          default: true
        }
      ]
    },
    {
      category: "Security",
      settings: [
        {
          key: "passcodeLock",
          label: "Enable Passcode / Biometric Lock",
          type: "checkbox",
          default: false
        }
      ]
    }
  ];

  interface BaseSetting {
    key: string;
    label: string;
    type: string;
    default: boolean | string | number;
  }

  interface CheckboxSetting extends BaseSetting {
    type: "checkbox";
    default: boolean;
  }

  interface SelectSetting extends BaseSetting {
    type: "select";
    options: string[];
    default: string;
  }

  interface NumberSetting extends BaseSetting {
    type: "number";
    default: number;
    min?: number;
  }

  interface SliderSetting extends BaseSetting {
    type: "slider";
    min: number;
    max: number;
    step?: number;
    default: number;
    labels?: string[];
  }

  interface TextSetting extends BaseSetting {
    type: "text";
    default: string;
    placeholder?: string;
  }

  interface PasswordSetting extends BaseSetting {
    type: "password";
    default: string;
    placeholder?: string;
  }

  type Setting =
    | CheckboxSetting
    | SelectSetting
    | NumberSetting
    | SliderSetting
    | TextSetting
    | PasswordSetting;

  const renderInput = (setting: Setting) => {
    const isSyncSetting = ["syncUrl", "syncUsername", "syncPassword", "syncDbName"].includes(setting.key);
    
    switch (setting.type) {
      case "checkbox":
        return (
          <label className="inline-flex items-center cursor-pointer select-none">
            {/* Hidden native checkbox for accessibility and state */}
            <input
              type="checkbox"
              defaultChecked={(setting as CheckboxSetting).default}
              className="sr-only peer"
            />
            {/* Track with pseudo-element thumb */}
            <span
              className="relative inline-block w-10 h-6 rounded-full bg-gray-300 transition-colors duration-200 peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-4"
            />
          </label>
        );
      case "select":
        return (
          <select
            defaultValue={setting.default}
            className="text-xs border-gray-200 rounded-md px-2 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors w-full"
          >
            {setting.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "text":
        return (
          <div className="flex flex-col w-full">
            <input
              type="text"
              value={isSyncSetting ? syncSettings[setting.key as keyof SyncSettings] : setting.default}
              onChange={(e) => isSyncSetting && handleSyncChange(setting.key as keyof SyncSettings, e.target.value)}
              placeholder={setting.placeholder}
              className={`text-xs w-full rounded-md px-2 py-1.5 transition-all ${
                isSyncSetting && validationErrors[setting.key as keyof SyncSettings] 
                  ? "border-2 border-red-400 bg-red-50 focus:ring-2 focus:ring-red-400" 
                  : "border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
            />
            {isSyncSetting && validationErrors[setting.key as keyof SyncSettings] && (
              <span className="text-red-600 text-xs mt-1 font-medium">
                {validationErrors[setting.key as keyof SyncSettings]}
              </span>
            )}
          </div>
        );
      case "password":
        return (
          <div className="flex flex-col w-full">
            <input
              type="password"
              value={isSyncSetting ? syncSettings[setting.key as keyof SyncSettings] : setting.default}
              onChange={(e) => isSyncSetting && handleSyncChange(setting.key as keyof SyncSettings, e.target.value)}
              placeholder={setting.placeholder}
              className={`text-xs w-full rounded-md px-2 py-1.5 transition-all ${
                isSyncSetting && validationErrors[setting.key as keyof SyncSettings] 
                  ? "border-2 border-red-400 bg-red-50 focus:ring-2 focus:ring-red-400" 
                  : "border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
            />
            {isSyncSetting && validationErrors[setting.key as keyof SyncSettings] && (
              <span className="text-red-600 text-xs mt-1 font-medium">
                {validationErrors[setting.key as keyof SyncSettings]}
              </span>
            )}
          </div>
        );
      case "number":
        return (
          <input
            type="number"
            defaultValue={setting.default}
            min={setting.min || 0}
            className="text-xs w-20 border border-gray-200 rounded-md px-2 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        );
      case "slider":
        if (setting.key === "textSize") {
          const nStages = (setting.max - setting.min) + 1;
          const labels = Array.from({ length: nStages }, () => "a");
          const percent = ((textSize - (setting.min)) / ((setting.max) - (setting.min))) * 100;
          return (
            <div className="flex flex-col items-stretch w-full">
              <input
                type="range"
                aria-label="Text size"
                min={setting.min}
                max={setting.max}
                step={setting.step || 1}
                value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
                className="tn-slider"
                style={{ ["--slider-progress" as any]: `${percent}%` }}
              />
              {/* Stage labels as previews */}
              <div className="flex justify-between w-full mt-2">
                {labels.map((label, idx) => {
                  const active = textSize === (setting.min + idx);
                  const sizes = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl"]; // map first 5
                  const sizeClass = sizes[idx] ?? "text-base";
                  return (
                    <span
                      key={label}
                      className={`text-center ${sizeClass} ${active ? "text-blue-600 font-semibold" : "text-gray-600"}`}
                      style={{ width: `${100 / nStages}%` }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-stretch w-full">
            <input
              type="range"
              defaultValue={setting.default}
              min={setting.min}
              max={setting.max}
              step={setting.step || 1}
              className="tn-slider"
            />
            {setting.labels && (
              <div className="flex justify-between w-full mt-1.5 text-xs text-gray-500">
                {setting.labels.map((label, idx) => (
                  <span key={idx}>{label}</span>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg h-full w-full flex flex-col">
      {/* Header */}
      <div className="z-10 flex sticky top-0 flex-row space-x-5 px-5 pt-5 pb-3 items-center select-none">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="w-full px-5 py-3">
        <div className="grid grid-cols-5 w-full bg-gray-100 rounded-lg p-1 relative">
          {/* Animated background indicator */}
          <div 
            className="absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-all duration-300 ease-out pointer-events-none"
            style={{
              left: `calc(${["Sync", "Appearance", "Notifications", "Tasks", "Security"].indexOf(activeTab) * 20}% + 0.25rem)`,
              width: `calc(20% - 0.5rem)`,
            }}
          />
          
          {/* Tab buttons */}
          {["Sync", "Appearance", "Notifications", "Tasks", "Security"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full justify-center items-center relative z-10 px-4 py-2 text-xs font-medium transition-colors duration-200 ${
                activeTab === tab
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="px-5 pb-5 pt-4 flex flex-col space-y-4 overflow-y-auto">
        {/* Sync Tab */}
        {activeTab === "Sync" && (
        <div className={`transition-all ease-in-out grid grid-cols-1 md:grid-cols-2 gap-3 ${tasklyPlus ? 'md:grid-cols-[4fr_1fr]' : ''}` }>
          {/* Taskly+ Enrollment */}
          <div className="rounded-xl p-4 bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex w-full items-start justify-between gap-4">
              <div className="w-full">
                <div className="flex flex-row w-full justify-between items-center">
                  <h3 className="text-2xl font-bold text-gray-900">Taskly+</h3>
                  <button
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      tasklyPlus
                        ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setTasklyPlus((v) => !v)}
                  >
                    {tasklyPlus ? "Manage" : "Learn more"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Seamless cloud sync and premium features</p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
                  <li>Automatic sync across devices</li>
                  <li>Priority support</li>
                  <li>Early access features</li>
                </ul>
              </div>
              </div>
              <div className="mt-4 flex flex-col items-center justify-between">
                <label className="inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    onChange={(e) => setTasklyPlus(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span
                    className="relative inline-block w-24 h-8 rounded-full bg-gray-300 transition-colors duration-200 peer-checked:bg-green-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-7 after:w-7 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-16"
                  />
                </label>
              <div className="text-sm inline-flex">
                {tasklyPlus ? (
                  <span className="text-emerald-600 font-medium">Enabled</span>
                ) : (
                  <span className="text-gray-600">Taskly+ is currently disabled</span>
                )}
              </div>
            </div>
          </div>

          {/* Manual CouchDB Sync Configurator - smoothly collapses when Taskly+ is enabled */}
          <div
            className={`bg-gray-50/50 rounded-xl border border-gray-200 md:justify-self-end transition-[max-width] duration-300 ease-out`}
            style={{ maxWidth: tasklyPlus ? '22rem' as const : '100%' }}
          >
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-100/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Manual Sync Configuration</h3>
                <p className="text-xs text-gray-500 mt-0.5">Configure your own CouchDB server</p>
              </div>
              {tasklyPlus && (
                <span className="text-[10px] uppercase tracking-wide bg-blue-600 text-white px-2 py-0.5 rounded-md">Taskly+ enabled</span>
              )}
            </div>

            <div
              className={`divide-y divide-gray-200 transition-all duration-300 ease-out ${
                tasklyPlus ? "max-h-0 overflow-hidden opacity-0 scale-y-95 pointer-events-none" : "max-h-[1200px] opacity-100 scale-y-100"
              }`}
              aria-hidden={tasklyPlus}
            >
              {/* Server URL */}
              <div className="px-3 py-2 hover:bg-gray-100/40 transition-colors">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">
                    {settingsConfig[0].settings[0].label}
                  </label>
                  <div className="w-full">
                    {renderInput(settingsConfig[0].settings[0])}
                  </div>
                </div>
              </div>
              
              {/* Username and Password in one row */}
              <div className="px-3 py-2 hover:bg-gray-100/40 transition-colors">
                <div className="grid grid-cols-2 gap-3">
                  {/* Username */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">
                      {settingsConfig[0].settings[1].label}
                    </label>
                    <div className="w-full">
                      {renderInput(settingsConfig[0].settings[1])}
                    </div>
                  </div>
                  
                  {/* Password */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">
                      {settingsConfig[0].settings[2].label}
                    </label>
                    <div className="w-full">
                      {renderInput(settingsConfig[0].settings[2])}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Database Name */}
              <div className="px-3 py-2 hover:bg-gray-100/40 transition-colors">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">
                    {settingsConfig[0].settings[3].label}
                  </label>
                  <div className="w-full">
                    {renderInput(settingsConfig[0].settings[3])}
                  </div>
                </div>
              </div>
              
              {/* Sync button */}
              <div className="px-3 py-2 bg-gray-100/30">
                <button
                  onClick={handleSaveAndValidate}
                  disabled={isTesting}
                  className="w-full bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? "Validating..." : "Save & Validate"}
                </button>
                
                {testStatus && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-xs font-medium ${
                      testStatus.includes("✓")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : testStatus.includes("✗")
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {testStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Appearance Tab */}
        {activeTab === "Appearance" && (
          <div className="bg-gray-50/50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {settingsConfig[1].settings.map((setting) => (
              <div key={setting.key} className="px-3 py-2.5 hover:bg-gray-100/40 transition-colors">
                <div className="flex flex-row items-start justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    {setting.label}
                  </label>
                  <div className="shrink-0 w-full min-w-[220px] max-w-[340px]">
                    {renderInput(setting)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "Notifications" && (
          <div className="bg-gray-50/50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {settingsConfig[2].settings.map((setting) => (
              <div key={setting.key} className="px-3 py-2.5 hover:bg-gray-100/40 transition-colors">
                <div className="flex flex-row items-start justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    {setting.label}
                  </label>
                  <div className="shrink-0 w-full min-w-[220px] max-w-[340px]">
                    {renderInput(setting)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "Tasks" && (
          <div className="bg-gray-50/50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {settingsConfig[3].settings.map((setting) => (
              <div key={setting.key} className="px-3 py-2.5 hover:bg-gray-100/40 transition-colors">
                <div className="flex flex-row items-start justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    {setting.label}
                  </label>
                  <div className="shrink-0 w-full min-w-[220px] max-w-[340px]">
                    {renderInput(setting)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "Security" && (
          <div className="bg-gray-50/50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {settingsConfig[4].settings.map((setting) => (
              <div key={setting.key} className="px-3 py-2.5 hover:bg-gray-100/40 transition-colors">
                <div className="flex flex-row items-start justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    {setting.label}
                  </label>
                  <div className="shrink-0 w-full min-w-[220px] max-w-[340px]">
                    {renderInput(setting)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
