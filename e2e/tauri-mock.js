/**
 * Tauri API Mock for E2E Testing
 *
 * このスクリプトは、ブラウザ環境でTauri APIをモックし、
 * E2Eテストがブラウザのみで動作できるようにします。
 *
 * ファイル保存・読み込み機能はE2Eテストではスキップし、
 * メモリ上での操作のみをテストします。
 */

// Tauri plugin-dialog のモック
window.__TAURI_INTERNALS__ = {
  invoke: async (cmd, args) => {
    console.log("[Tauri Mock] invoke:", cmd, args);

    // ファイルダイアログ関連のコマンドはnullを返す（キャンセル扱い）
    if (cmd.includes("dialog") || cmd.includes("save") || cmd.includes("open")) {
      return null;
    }

    // ファイル操作関連はエラーを返す
    if (cmd.includes("fs") || cmd.includes("file")) {
      throw new Error("File operations are not supported in E2E test environment");
    }

    return null;
  },
  transformCallback: (callback, once) => {
    const id = Math.random().toString(36).slice(2);
    window[`_${id}`] = callback;
    return id;
  },
  convertFileSrc: (path) => path,
  metadata: {
    currentWindow: { label: "main" },
    currentWebview: { label: "main" },
  },
};

// Tauri window object
window.__TAURI__ = {
  dialog: {
    open: async () => null,
    save: async () => null,
    message: async () => {},
    ask: async () => false,
    confirm: async () => false,
  },
  fs: {
    readTextFile: async () => {
      throw new Error("File operations are not supported in E2E test environment");
    },
    writeTextFile: async () => {
      throw new Error("File operations are not supported in E2E test environment");
    },
  },
};

console.log("[Tauri Mock] Tauri API mocked for E2E testing");
