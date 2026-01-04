import React, { useState, useCallback, useEffect, createContext, useContext } from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

// Context to expose close handler to child components
interface ModalContextType {
  close: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

/** Hook to access the modal's close function with animation */
export function useModalClose() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalClose must be used within a Modal component");
  }
  return context.close;
}

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title (optional - if not provided, no header is shown) */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Size preset for the modal */
  size?: ModalSize;
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Custom className for the modal container */
  className?: string;
  /** Whether to show the header */
  showHeader?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-lg max-h-[250px]",
  md: "max-w-xl max-h-[500px]",
  lg: "max-w-3xl max-h-[600px]",
  xl: "max-w-6xl max-h-[800px]",
  full: "max-w-[95vw] max-h-[95vh]",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = "",
  showHeader = true,
}: ModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 md:p-14">
      {/* Backdrop */}
      <div
        className={`modal-backdrop absolute inset-0 bg-[#f3f3f3]/60 dark:bg-[#202020]/80 ${isClosing ? "closing" : ""}`}
        onClick={closeOnBackdropClick ? handleClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={`modal-content relative w-full h-full flex flex-col overflow-hidden rounded-lg bg-white dark:bg-neutral-900 shadow-2xl ring-1 ring-neutral-200 dark:ring-neutral-700 ${sizeClasses[size]} ${className} ${isClosing ? "closing" : ""}`}
      >
        {/* Header */}
        {showHeader && (title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
            {title ? (
              <h2 id="modal-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
              </h2>
            ) : (
              <div />
            )}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <ModalContext.Provider value={{ close: handleClose }}>
            {children}
          </ModalContext.Provider>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Modal subcomponents for composition
// ============================================

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className = "" }: ModalBodyProps) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}

interface ModalSidebarProps {
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export function ModalSidebar({ children, className = "", width = "w-48" }: ModalSidebarProps) {
  return (
    <nav className={`${width} shrink-0 border-r border-neutral-100 dark:border-neutral-800 py-3 px-2 bg-neutral-50/50 dark:bg-neutral-800/30 ${className}`}>
      {children}
    </nav>
  );
}

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalContent({ children, className = "" }: ModalContentProps) {
  return (
    <div className={`flex-1 overflow-y-auto p-6 bg-white dark:bg-neutral-900 ${className}`}>
      {children}
    </div>
  );
}

interface ModalSplitLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalSplitLayout({ children, className = "" }: ModalSplitLayoutProps) {
  return (
    <div className={`flex-1 flex flex-row overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export default Modal;
