import { useState } from 'react';
import { Modal, ModalBody, useModalClose } from './ui/Modal';

interface UpdateInfo {
  version: string;
  date: string;
  body?: string;
  currentVersion: string;
}

function UpdaterModalDemoContent({
  updateInfo,
  isDownloading,
  downloadProgress,
  isInstalling,
  error,
  onUpdate,
}: {
  updateInfo: UpdateInfo;
  isDownloading: boolean;
  downloadProgress: number;
  isInstalling: boolean;
  error: string | null;
  onUpdate: () => void;
}) {
  const close = useModalClose();
  const canUpdate = !isDownloading && !isInstalling && !error;

  return (
    <ModalBody className="flex flex-col h-full">
      {/* Version Header */}
      <div className="mb-6">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
          {updateInfo.currentVersion} → {updateInfo.version}
        </div>
        <h3 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
          Update Available
        </h3>
      </div>

      {/* Release Notes */}
      {updateInfo.body && (
        <div className="mb-6 flex-1 overflow-y-auto">
          <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 leading-relaxed">
            {updateInfo.body.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {(isDownloading || isInstalling) && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
            <span>
              {isDownloading ? 'Downloading' : 'Installing'}
            </span>
            {isDownloading && (
              <span>
                {(downloadProgress / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1 overflow-hidden">
            <div
              className="bg-neutral-900 dark:bg-neutral-100 h-full rounded-full transition-all duration-300"
              style={{
                width: isInstalling
                  ? '100%'
                  : `${Math.min((downloadProgress / 10485760) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Installing Message */}
      {isInstalling && (
        <div className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          App will restart automatically
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-col fixed bottom-4 left-4 right-4">
        <div className="h-px bg-neutral-200 dark:bg-neutral-800 mb-4" />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={close}
            disabled={isDownloading || isInstalling}
            className="px-4 py-1.5 rounded-md text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onUpdate}
            disabled={!canUpdate}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDownloading ? 'Downloading' : isInstalling ? 'Installing' : 'Update'}
          </button>
        </div>
      </div>
    </ModalBody>
  );
}

const UpdaterModalDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateInfo: UpdateInfo = {
    version: '1.2.0',
    date: new Date().toISOString(),
    body: '• Added new task filtering options\n• Improved sync performance\n• Fixed date picker issues on Windows\n• Enhanced security features\n• Bug fixes and performance improvements',
    currentVersion: '1.1.0',
  };

  const handleUpdate = () => {
    setError(null);
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        const next = prev + 1024 * 500; // Simulate 500KB chunks
        if (next >= 10485760) {
          // 10MB
          clearInterval(interval);
          setIsDownloading(false);
          setIsInstalling(true);

          // Simulate installation
          setTimeout(() => {
            alert('Demo complete! In production, the app would restart now.');
            setIsInstalling(false);
            setIsOpen(false);
            setDownloadProgress(0);
          }, 2000);

          return 10485760;
        }
        return next;
      });
    }, 100);
  };

  const handleClose = () => {
    if (isDownloading || isInstalling) return;
    setIsOpen(false);
    setDownloadProgress(0);
    setIsDownloading(false);
    setIsInstalling(false);
    setError(null);
  };

  const handleShowDemo = () => {
    setIsOpen(true);
    setError(null);
    setIsDownloading(false);
    setIsInstalling(false);
    setDownloadProgress(0);
  };

  return (
    <>
      {/* Demo Trigger Button */}
      <button
        onClick={handleShowDemo}
        className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
      >
        Test Updater UI
      </button>

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="md"
        showHeader={false}
        closeOnBackdropClick={!isDownloading && !isInstalling}
        closeOnEscape={!isDownloading && !isInstalling}
      >
        <UpdaterModalDemoContent
          updateInfo={updateInfo}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          isInstalling={isInstalling}
          error={error}
          onUpdate={handleUpdate}
        />
      </Modal>
    </>
  );
};

export default UpdaterModalDemo;
