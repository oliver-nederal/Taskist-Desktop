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

const textClasses = {
  blue: 'text-blue-600',
  green: 'text-teal-600',
  yellow: 'text-yellow-600',
  purple: 'text-indigo-700',
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
          className={`cursor-pointer h-18 w-full rounded-lg border p-2 text-sm transition-all
          duration-150 ${bgClass} ${isActive ? 'border-transparent text-black' : 'border-neutral-200 text-gray-700 '}
          ${isMenuOpen ? 'grid grid-cols-2 grid-rows-2' : 'grid-cols-1 grid-rows-2 justify-center items-center'}
      `}
      >

      <span
        className={`grid place-items-center ${iconBg} ${textClass} rounded-full p-1 h-full aspect-square shadow-2xs`}
      >
        {icon}
      </span>

      <span className="row-span-2 flex justify-end items-end w-full h-full">
        1
      </span>

      {isMenuOpen ? (
        <span className="flex justify-start items-end font-medium">
          {label}
        </span>
      ) : null}
    </button>
  );
};