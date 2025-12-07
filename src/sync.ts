import PouchDB from "pouchdb";
import { localDB } from "./db";

export type SyncStatus = "idle" | "connecting" | "syncing" | "paused" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSynced?: number;
  error?: string;
  info?: unknown;
}

export interface SyncOptions {
  username?: string;
  password?: string;
  onStateChange?: (state: SyncState) => void;
  logRemoteSnapshot?: boolean;
}

export interface SyncController {
  cancel: () => void;
  remote: PouchDB.Database;
}

export function startSync(
  remoteUrl: string,
  dbName: string,
  options: SyncOptions = {}
): SyncController {
  const { username, password, onStateChange, logRemoteSnapshot = true } = options;

  const normalizedUrl = normalizeRemoteUrl(remoteUrl);
  const remoteDbUrl = `${normalizedUrl}/${dbName}`;

  const emitState = (state: SyncState) => {
    onStateChange?.(state);
    console.log("[sync] state update", state);
  };

  emitState({ status: "connecting" });

  const remote = new PouchDB(remoteDbUrl, {
    auth: username && password ? { username, password } : undefined,
  });

  if (logRemoteSnapshot) {
    remote
      .info()
      .then((info) => console.log("[sync] remote info", info))
      .catch((err) => console.error("[sync] remote info error", err));

    remote
      .allDocs({ include_docs: true, limit: 20 })
      .then((snapshot) => {
        const docs = snapshot.rows.map((row) => row.doc);
        console.log(`(sync) remote snapshot (${docs.length} docs)`, docs);
      })
      .catch((err) => console.error("[sync] remote snapshot error", err));
  }

  const sync = localDB.sync(remote, { live: true, retry: true });

  sync
    .on("change", (info) => {
      console.log("[sync] replication change", info);
      emitState({ status: "syncing", lastSynced: Date.now(), info });
    })
    .on("paused", (err) => {
      if (err) {
        console.error("[sync] paused with error", err);
        emitState({ status: "error", error: toErrorMessage(err) });
      } else {
        emitState({ status: "paused", lastSynced: Date.now() });
      }
    })
    .on("active", () => {
      emitState({ status: "syncing", lastSynced: Date.now() });
    })
    .on("denied", (err) => {
      console.error("[sync] denied", err);
      emitState({ status: "error", error: toErrorMessage(err) });
    })
    .on("complete", (info) => {
      console.log("[sync] complete", info);
      emitState({ status: "paused", lastSynced: Date.now(), info });
    })
    .on("error", (err) => {
      console.error("[sync] error", err);
      emitState({ status: "error", error: toErrorMessage(err) });
    });

  return {
    cancel: () => {
      console.log("[sync] cancelled");
      emitState({ status: "paused", lastSynced: Date.now() });
      (sync as { cancel?: () => void }).cancel?.();
    },
    remote,
  };
}

function normalizeRemoteUrl(remoteUrl: string): string {
  if (remoteUrl.startsWith("https://") || remoteUrl.startsWith("http://")) {
    return remoteUrl;
  }

  return `http://${remoteUrl}`;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  try {
    return JSON.stringify(err);
  } catch (_) {
    return String(err);
  }
}