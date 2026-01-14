// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState, useEffect } from "react";

import { SidebarButton } from "../Buttons/SidebarButton";
import { Modal, ModalSplitLayout, ModalSidebar, ModalContent } from "../ui/Modal";

import { SettingsAPI, SyncAPI, type SyncSettings } from "../../backend";
//import { useTasks } from "../../context/TasksContext";

import { IoSync, IoColorPalette, IoNotifications, IoCheckboxOutline, IoShieldCheckmark } from "react-icons/io5";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

function SettingsModal({ isOpen, onClose }: SettingsProps) {
  //const { restartSync } = useTasks();
  const [activeTab, setActiveTab] = useState<string>("Sync");
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    syncMode: "local",
    syncUrl: "localhost:5984",
    syncUsername: "admin",
    syncPassword: "admin",
    syncDbName: "tasks_db",
  });
  const [testStatus, setTestStatus] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof SyncSettings, string>>>({});
  // Appearance preview states
  const [textSize, setTextSize] = useState<number>(1);
  // Taskly+ (UI-level state)
  const [tasklyPlus, setTasklyPlus] = useState<boolean>(false);

  // Load settings on mount
  useEffect(() => {
    SettingsAPI.getSyncSettings().then(setSyncSettings).catch(console.error);
  }, []);

  // Validate a single field - only validate CouchDB fields when in selfhosted mode
  const validateField = (key: keyof SyncSettings, value: string): string => {
    // Skip validation for CouchDB fields when not in selfhosted mode
    if (syncSettings.syncMode !== "selfhosted") {
      if (["syncUrl", "syncUsername", "syncPassword", "syncDbName"].includes(key)) {
        return "";
      }
    }
    
    switch (key) {
      case "syncMode":
        return ""; // syncMode is always valid
      
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
    
    // Different message based on sync mode
    if (syncSettings.syncMode === "local") {
      setTestStatus("Saving settings...");
    } else if (syncSettings.syncMode === "cloud") {
      setTestStatus("Connecting to Taskly Cloud...");
    } else {
      setTestStatus("Validating CouchDB connection...");
    }
    
    try {
      // Save settings to encrypted storage
      await SettingsAPI.saveSyncSettings(syncSettings);
      
      // Restart sync to test and apply the new settings
      await SyncAPI.restart();
      
      // Different success message based on mode
      if (syncSettings.syncMode === "local") {
        setTestStatus(`✓ Settings saved! Using local-only storage.`);
      } else if (syncSettings.syncMode === "cloud") {
        setTestStatus(`✓ Connected to Taskly Cloud! Sync enabled.`);
      } else {
        setTestStatus(`✓ Settings saved! CouchDB sync restarted.`);
      }
      setTimeout(() => setTestStatus(""), 5000);
    } catch (error: any) {
      console.error("[settings] save/validation failed:", error);
      setTestStatus(`✗ Error: ${error.message || String(error)}`);
      setTimeout(() => setTestStatus(""), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  type SettingsCategory = {
    category: string;
    icon: React.ReactNode;
    settings: Setting[];
  };

  const settingsConfig: SettingsCategory[] = [
    {
      category: "Sync & Database",
      icon: <IoSync size={16} />,
      settings: [
        {
          key: "syncMode",
          label: "Sync Mode",
          type: "select",
          options: ["local", "selfhosted", "cloud"],
          optionLabels: {
            local: "Local Only (SQLite)",
            selfhosted: "Self-Hosted CouchDB",
            cloud: "Taskly Cloud"
          },
          default: syncSettings.syncMode || "local"
        },
        {
          key: "syncUrl",
          label: "CouchDB Server URL",
          type: "text",
          default: syncSettings.syncUrl,
          placeholder: "e.g., localhost:5984 or https://couch.example.com"
        },
        {
          key: "syncUsername",
          label: "CouchDB Username",
          type: "text",
          default: syncSettings.syncUsername,
          placeholder: "CouchDB admin username"
        },
        {
          key: "syncPassword",
          label: "CouchDB Password",
          type: "password",
          default: syncSettings.syncPassword,
          placeholder: "CouchDB admin password"
        },
        {
          key: "syncDbName",
          label: "Remote Database Name",
          type: "text",
          default: syncSettings.syncDbName,
          placeholder: "CouchDB database name (e.g., tasks_db)"
        }
      ]
    },
    {
      category: "Appearance",
      icon: <IoSync size={16} />,
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
      icon: <IoSync size={16} />,
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
      icon: <IoSync size={16} />,
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
      icon: <IoSync size={16} />,
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
    optionLabels?: Record<string, string>;
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
    const isSyncSetting = ["syncMode", "syncUrl", "syncUsername", "syncPassword", "syncDbName"].includes(setting.key);
    
    switch (setting.type) {
      case "checkbox":
        return (
          <label className="inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              defaultChecked={(setting as CheckboxSetting).default}
              className="sr-only peer"
            />
            <span
              className="relative inline-block w-11 h-6 rounded-full bg-neutral-300 dark:bg-neutral-600 transition-colors duration-200 peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-5"
            />
          </label>
        );
      case "select":
        const selectSetting = setting as SelectSetting;
        const isSyncModeSelect = setting.key === "syncMode";
        return (
          <select
            value={isSyncModeSelect ? syncSettings.syncMode : setting.default}
            onChange={(e) => {
              if (isSyncModeSelect) {
                handleSyncChange("syncMode", e.target.value);
              }
            }}
            className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors w-full"
          >
            {selectSetting.options.map((opt) => (
              <option key={opt} value={opt}>
                {selectSetting.optionLabels?.[opt] || opt}
              </option>
            ))}
          </select>
        );
      case "text":
        return (
          <div className="flex flex-col w-full gap-1">
            <input
              type="text"
              value={isSyncSetting ? syncSettings[setting.key as keyof SyncSettings] : setting.default}
              onChange={(e) => isSyncSetting && handleSyncChange(setting.key as keyof SyncSettings, e.target.value)}
              placeholder={setting.placeholder}
              className={`text-sm w-full rounded-lg px-3 py-2 transition-all ${
                isSyncSetting && validationErrors[setting.key as keyof SyncSettings] 
                  ? "border-2 border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-2 focus:ring-red-400" 
                  : "border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
            />
            {isSyncSetting && validationErrors[setting.key as keyof SyncSettings] && (
              <span className="text-red-500 text-xs font-medium">
                {validationErrors[setting.key as keyof SyncSettings]}
              </span>
            )}
          </div>
        );
      case "password":
        return (
          <div className="flex flex-col w-full gap-1">
            <input
              type="password"
              value={isSyncSetting ? syncSettings[setting.key as keyof SyncSettings] : setting.default}
              onChange={(e) => isSyncSetting && handleSyncChange(setting.key as keyof SyncSettings, e.target.value)}
              placeholder={setting.placeholder}
              className={`text-sm w-full rounded-lg px-3 py-2 transition-all ${
                isSyncSetting && validationErrors[setting.key as keyof SyncSettings] 
                  ? "border-2 border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-2 focus:ring-red-400" 
                  : "border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
            />
            {isSyncSetting && validationErrors[setting.key as keyof SyncSettings] && (
              <span className="text-red-500 text-xs font-medium">
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
            className="text-sm w-24 border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:border-neutral-300 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        );
      case "slider":
        if (setting.key === "textSize") {
          const nStages = (setting.max - setting.min) + 1;
          const labels = Array.from({ length: nStages }, () => "a");
          const percent = ((textSize - (setting.min)) / ((setting.max) - (setting.min))) * 100;
          return (
            <div className="flex flex-col items-stretch w-full gap-2">
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
              <div className="flex justify-between w-full">
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

  const tabs = [
    { key: "Sync", label: "Sync", icon: <IoSync size={16} /> },
    { key: "Appearance", label: "Appearance", icon: <IoColorPalette size={16} /> },
    { key: "Notifications", label: "Notifications", icon: <IoNotifications size={16} /> },
    { key: "Tasks", label: "Tasks", icon: <IoCheckboxOutline size={16} /> },
    { key: "Security", label: "Security", icon: <IoShieldCheckmark size={16} /> },
  ] as const;
  const previewSizes = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl"];
  const previewSizeClass = previewSizes[textSize - 1] ?? "text-base";
  const manualDisabled = tasklyPlus;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      showHeader={false}
    >
      <ModalSplitLayout>
        {/* Sidebar Navigation */}
        <ModalSidebar className="space-y-0.5">
          <h1 className="font-medium text-lg p-2">Settings</h1>
          {tabs.map((tab) => (
            <SidebarButton 
              key={tab.key}
              icon={tab.icon}
              label={tab.label}
              color="blue"
              tabKey={tab.key}
              currentTab={activeTab}
              isMenuOpen={true}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </ModalSidebar>

        {/* Content Area */}
        <ModalContent>
          {/* Sync */}
          {activeTab === "Sync" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Sync & Database</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Keep your tasks synchronized across devices</p>
              </div>

              {/* Taskly+ Card */}
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Taskly+</span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold">Recommended</span>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Cloud sync with zero configuration</p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tasklyPlus}
                      onChange={(e) => setTasklyPlus(e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="relative inline-block w-11 h-6 rounded-full bg-neutral-300 dark:bg-neutral-600 transition-colors duration-200 peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:after:translate-x-5" />
                  </label>
                </div>
                {tasklyPlus && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Syncing with Taskly+ servers
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700"></div>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">or</span>
                <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700"></div>
              </div>

              {/* Self-hosted Section */}
              <div className={`rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden ${manualDisabled ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Self-hosted CouchDB</span>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect to your own database server</p>
                    </div>
                    {manualDisabled && (
                      <span className="text-xs px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">Disabled</span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Server URL</label>
                    {renderInput(settingsConfig[0].settings[1])}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Username</label>
                      {renderInput(settingsConfig[0].settings[2])}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Password</label>
                      {renderInput(settingsConfig[0].settings[3])}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Database Name</label>
                    {renderInput(settingsConfig[0].settings[4])}
                  </div>
                </div>
                <div className="p-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <button
                    onClick={handleSaveAndValidate}
                    disabled={isTesting || manualDisabled}
                    className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 active:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTesting ? "Validating..." : "Save & Validate"}
                  </button>
                  {testStatus && (
                    <p className={`mt-3 text-sm font-medium ${
                      testStatus.includes("✓") ? "text-emerald-600 dark:text-emerald-400" : 
                      testStatus.includes("✗") ? "text-red-500" : "text-blue-500"
                    }`}>
                      {testStatus}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === "Appearance" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Appearance</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Customize how Taskly looks</p>
              </div>

              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
                {settingsConfig[1].settings.map((setting) => (
                  <div key={setting.key} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{setting.label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Adjust the visual style</p>
                    </div>
                    <div className="w-48 shrink-0">{renderInput(setting)}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">Preview</p>
                <div className={`rounded-lg border border-dashed border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 px-4 py-4 space-y-2 ${previewSizeClass}`}>
                  <p className="text-neutral-900 dark:text-neutral-100 font-medium">Sample heading text</p>
                  <p className="text-neutral-600 dark:text-neutral-400">This is how your body text will appear. Adjust the slider to preview different sizes.</p>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "Notifications" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Notifications</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Manage reminders and alerts</p>
              </div>

              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
                {settingsConfig[2].settings.map((setting) => (
                  <div key={setting.key} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{setting.label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Stay informed without distractions</p>
                    </div>
                    <div className="w-48 shrink-0">{renderInput(setting)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {activeTab === "Tasks" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Tasks</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Default settings for your tasks</p>
              </div>

              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
                {settingsConfig[3].settings.map((setting) => (
                  <div key={setting.key} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{setting.label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Configure task defaults</p>
                    </div>
                    <div className="w-48 shrink-0">{renderInput(setting)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === "Security" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Security</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Protect your data on this device</p>
              </div>

              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
                {settingsConfig[4].settings.map((setting) => (
                  <div key={setting.key} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{setting.label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Add an extra layer of protection</p>
                    </div>
                    <div className="w-48 shrink-0">{renderInput(setting)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalContent>
      </ModalSplitLayout>
    </Modal>
  );
}

export default SettingsModal;
