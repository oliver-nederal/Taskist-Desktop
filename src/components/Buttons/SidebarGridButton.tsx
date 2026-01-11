interface SidebarButtonProps {
  icon?: React.ReactNode;
  label: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  tabKey: string;
  currentTab: string;
  isMenuOpen?: boolean;
  onClick: () => void;
}

const bgClasses = {
  blue: {
    active: 'bg-blue-300',
    inactive: 'bg-blue-300/50',
  },
  green: {
    active: 'bg-emerald-100',
    inactive: 'bg-emerald-100/50',
  },
  yellow: {
    active: 'bg-yellow-200',
    inactive: 'bg-yellow-200/50',
  },
  purple: {
    active: 'bg-violet-300',
    inactive: 'bg-violet-300/50',
  },
} as const;

// UPDATED: Darker text colors for better readability on pastel backgrounds
const textClasses = {
  blue: 'text-blue-900',      // Was text-blue-600 (too light)
  green: 'text-emerald-900',  // Was text-teal-600 (too light)
  yellow: 'text-yellow-900',  // Was text-yellow-600 (too light)
  purple: 'text-indigo-900',  // Was text-indigo-700
} as const;

export const SidebarGridButton = ({
  icon,
  label,
  color,
  tabKey,
  currentTab,
  isMenuOpen,
  onClick
}: SidebarButtonProps) => {
  const isActive = currentTab === tabKey;
  const iconBg = "bg-white/70";

  const bgClass = isActive
      ? bgClasses[color].active
      : bgClasses[color].inactive;

  const textClass = textClasses[color];

  return (
      <button
          onClick={onClick}
          // FIXED: Switched closed state to 'flex' for perfect centering
          className={`cursor-pointer h-18 w-full rounded-lg border p-2 text-sm transition-all duration-150 
          ${bgClass} 
          ${isActive ? 'border-transparent' : 'border-neutral-200 dark:border-neutral-800 text-gray-700 dark:text-white'} 
          ${isMenuOpen ? 'grid grid-cols-2 grid-rows-2' : 'flex justify-center items-center'}
      `}
      >

      <span
        className={`grid place-items-center ${iconBg} ${isActive ? textClass : 'text-gray-600'} rounded-full p-1 h-full aspect-square shadow-2xs`}
      >
        {icon}
      </span>

      {/* FIXED: Only show text/number when menu is open to prevent centering issues */}
      {isMenuOpen && (
        <>
          <span className={`row-span-2 flex justify-end items-end w-full h-full font-bold text-md ${isActive ? textClass : ''}`}>
            1
          </span>

          <span className={`flex justify-start items-end font-medium text-sm opacity-90 ${isActive ? textClass : ''}`}>
            {label}
          </span>
        </>
      )}
    </button>
  );
};