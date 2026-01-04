import { useState, useRef, useEffect } from "react";
import { Modal, ModalBody, useModalClose } from "../ui/Modal";
import { TasksAPI } from "../../backend";
import { IoFlagOutline, IoFolderOutline } from "react-icons/io5";
import DatePicker from "../ui/DatePickerPortal";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateTaskModalContent() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const close = useModalClose();

  // Focus title input on mount
  useEffect(() => {
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await TasksAPI.add(title.trim(), {
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      close(); // Use animated close
    } catch (error) {
      console.error("Failed to create task:", error);
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Get today's date as minimum for date picker
  const today = new Date().toISOString().split("T")[0];

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  return (
    <ModalBody className="flex flex-col h-full">
      {/* Task Title */}
      <input
        ref={titleInputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task name"
        className="w-full bg-transparent text-lg font-medium text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="w-full h-32 bg-transparent mt-2 text-sm text-neutral-600 dark:text-neutral-400 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none resize-none"
      />

      

      {/* Bottom row: chips + buttons */}
      <div className="flex flex-col fixed bottom-4 left-4 right-4">
        {/* Divider */}
        <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-3" />
        <div className="flex flex-row justify-between w-full items-center">
            <div className="flex gap-1">
            {/* Date Picker */}
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              minDate={today}
            />
            
            <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
                <IoFlagOutline size={14} />
                <span className="hidden sm:inline">Priority</span>
            </button>
            <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
                <IoFolderOutline size={14} />
                <span className="hidden sm:inline">Project</span>
            </button>
            </div>

            <div className="flex gap-2">
            <button
                type="button"
                onClick={close}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-1.5 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isSubmitting ? "Adding..." : "Add task"}
            </button>
            </div>
        </div>
        
      </div>
    </ModalBody>
  );
}

function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showHeader={false}
    >
      <CreateTaskModalContent />
    </Modal>
  );
}

export default CreateTaskModal;
