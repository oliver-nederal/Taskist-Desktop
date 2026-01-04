interface SidebarButtonProps {
  icon?: React.ReactNode;
  label: string;
  color: string;
  tabKey: string;
  currentTab: string;
  isMenuOpen?: boolean;
  onClick: () => void;
}

export const SidebarButton = ({
  icon,
  label,
  tabKey,
  currentTab,
  isMenuOpen,
  onClick
}: SidebarButtonProps) => {
  const isActive = currentTab === tabKey;

  return (
    <button
      onClick={onClick}
      className={`hover:bg-neutral-200 hover:dark:bg-neutral-800 cursor-pointer text-sm rounded-lg p-1.5 flex items-center w-full transition-all duration-150 ${
        isActive ? "bg-neutral-200 text-black" : "text-gray-700 dark:text-neutral-200"
      }`}
    >
      <span
        className={
          "flex items-center justify-center" +
          (isMenuOpen ? " mr-2" : " h-8")
        }
      >
        {icon ? icon : null}
      </span>

      {isMenuOpen ? label : null}
    </button>
  );
};