"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AndroidCameraEmbedPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  photosFolder: "",
  createFolderIfMissing: true
};
var AndroidCameraEmbedPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new AndroidCameraEmbedSettingTab(this.app, this));
    (0, import_obsidian.addIcon)(
      "android-camera-embed",
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h2l1.2-2h5.6L16 7h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="3.5"/><path d="M8.5 7h7"/></svg>'
    );
    this.addRibbonIcon("android-camera-embed", "Capture photo", () => {
      void this.captureAndEmbed();
    });
    this.addCommand({
      id: "capture-photo-embed",
      name: "Capture photo and embed",
      callback: () => {
        void this.captureAndEmbed();
      }
    });
  }
  async captureAndEmbed() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view) {
      new import_obsidian.Notice("Open a markdown note to insert the photo.");
      return;
    }
    const activeFile = view.file;
    if (!activeFile) {
      new import_obsidian.Notice("No active note to insert the photo.");
      return;
    }
    const file = await this.pickImageFromCamera();
    if (!file) {
      return;
    }
    const arrayBuffer = await file.arrayBuffer();
    const parent = this.app.fileManager.getNewFileParent(activeFile.path);
    const targetFolderPath = await this.ensureTargetFolder(parent);
    if (!targetFolderPath) {
      return;
    }
    const fileName = this.buildFileName(file);
    const targetPath = this.getAvailablePath(
      this.joinPath(targetFolderPath, fileName)
    );
    const created = await this.app.vault.createBinary(targetPath, arrayBuffer);
    const link = this.app.fileManager.generateMarkdownLink(created, activeFile.path);
    view.editor.replaceSelection(`!${link}`);
  }
  pickImageFromCamera() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.style.display = "none";
      const timeoutId = window.setTimeout(() => {
        input.remove();
        resolve(null);
      }, 6e4);
      const cleanup = (file) => {
        window.clearTimeout(timeoutId);
        input.remove();
        resolve(file);
      };
      input.addEventListener("change", () => {
        const file = input.files && input.files.length > 0 ? input.files[0] : null;
        cleanup(file);
      });
      document.body.appendChild(input);
      input.click();
    });
  }
  buildFileName(file) {
    var _a, _b;
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const fallbackExt = (_a = this.extensionFromType(file.type)) != null ? _a : "jpg";
    const ext = (_b = this.extensionFromName(file.name)) != null ? _b : fallbackExt;
    return `photo-${stamp}.${ext}`;
  }
  extensionFromName(name) {
    const match = name.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1] : null;
  }
  extensionFromType(mimeType) {
    if (!mimeType.startsWith("image/")) {
      return null;
    }
    const subtype = mimeType.split("/")[1];
    if (!subtype) {
      return null;
    }
    return subtype.replace("jpeg", "jpg");
  }
  joinPath(parentPath, fileName) {
    if (!parentPath) {
      return fileName;
    }
    return `${parentPath}/${fileName}`;
  }
  getAvailablePath(path) {
    var _a;
    if (!this.app.vault.getAbstractFileByPath(path)) {
      return path;
    }
    const parts = path.split("/");
    const name = (_a = parts.pop()) != null ? _a : path;
    const dir = parts.length > 0 ? `${parts.join("/")}/` : "";
    const extIndex = name.lastIndexOf(".");
    const base = extIndex === -1 ? name : name.slice(0, extIndex);
    const ext = extIndex === -1 ? "" : name.slice(extIndex);
    for (let i = 1; i < 1e3; i += 1) {
      const candidate = `${dir}${base}-${i}${ext}`;
      if (!this.app.vault.getAbstractFileByPath(candidate)) {
        return candidate;
      }
    }
    return `${dir}${base}-${Date.now()}${ext}`;
  }
  async ensureTargetFolder(parent) {
    const rawPath = this.settings.photosFolder.trim();
    if (!rawPath) {
      return parent.path;
    }
    const normalized = (0, import_obsidian.normalizePath)(rawPath);
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (existing instanceof import_obsidian.TFolder) {
      return existing.path;
    }
    if (!this.settings.createFolderIfMissing) {
      new import_obsidian.Notice(`Folder not found: ${normalized}`);
      return null;
    }
    try {
      await this.app.vault.createFolder(normalized);
      return normalized;
    } catch (error) {
      new import_obsidian.Notice(`Failed to create folder: ${normalized}`);
      return null;
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var AndroidCameraEmbedSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Android only").setDesc("This plugin is intended for Android and is not supported on iOS or desktop.");
    new import_obsidian.Setting(containerEl).setName("Photos folder").setDesc(
      "Optional. Use a vault-relative path like Attachments/Camera. Leave blank to store next to the note."
    ).addText(
      (text) => text.setPlaceholder("Attachments/Camera").setValue(this.plugin.settings.photosFolder).onChange(async (value) => {
        this.plugin.settings.photosFolder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Create folder if missing").setDesc("Automatically create the photos folder if it does not exist.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.createFolderIfMissing).onChange(async (value) => {
        this.plugin.settings.createFolderIfMissing = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
