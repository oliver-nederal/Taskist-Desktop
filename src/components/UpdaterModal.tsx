import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { listen } from '@tauri-apps/api/event';
import { Modal, ModalBody, useModalClose } from './ui/Modal';

interface UpdateInfo {
  version: string;
  date: string;
  body?: string;
  currentVersion: string;
}

function UpdaterModalContent({ 
  updateInfo, 
  isDownloading, 
  downloadProgress, 
  isInstalling, 
  error,
  onUpdate 
}: {
  updateInfo: UpdateInfo | null;
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
          {updateInfo?.currentVersion} → {updateInfo?.version}
        </div>
        <h3 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
          Update Available
        </h3>
      </div>

      {/* Release Notes */}
      {updateInfo?.body && (
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
                width: isInstalling ? '100%' : `${Math.min((downloadProgress / 10485760) * 100, 100)}%`,
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

const UpdaterModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates();

    // Listen for manual update checks
    const unlisten = listen('check-for-updates', () => {
      checkForUpdates();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      setError(null);
      const update = await check();

      if (update?.available) {
        setUpdateInfo({
          version: update.version,
          date: update.date || new Date().toISOString(),
          body: update.body,
          currentVersion: update.currentVersion,
        });
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setError('Failed to check for updates. Please try again later.');
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;

    try {
      setError(null);
      setIsDownloading(true);

      const update = await check();
      if (!update?.available) {
        setError('Update is no longer available');
        return;
      }

      // Download and install with progress tracking
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setDownloadProgress(0);
            break;
          case 'Progress':
            setDownloadProgress(event.data.chunkLength);
            break;
          case 'Finished':
            setIsDownloading(false);
            setIsInstalling(true);
            break;
        }
      });

      // Relaunch the app after installation
      await relaunch();
    } catch (err) {
      console.error('Failed to install update:', err);
      setError('Failed to install update. Please try again.');
      setIsDownloading(false);
      setIsInstalling(false);
    }
  };

  const handleClose = () => {
    if (isDownloading || isInstalling) return;
    setIsOpen(false);
    setUpdateInfo(null);
    setDownloadProgress(0);
    setIsDownloading(false);
    setIsInstalling(false);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      showHeader={false}
      closeOnBackdropClick={!isDownloading && !isInstalling}
      closeOnEscape={!isDownloading && !isInstalling}
    >
      <UpdaterModalContent
        updateInfo={updateInfo}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        isInstalling={isInstalling}
        error={error}
        onUpdate={handleUpdate}
      />
    </Modal>
  );
};

export default UpdaterModal;
