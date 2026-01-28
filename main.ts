import {
  MarkdownView,
  Notice,
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  TFolder,
  addIcon,
  normalizePath,
} from "obsidian";

interface AndroidCameraEmbedSettings {
  photosFolder: string;
  createFolderIfMissing: boolean;
}

const DEFAULT_SETTINGS: AndroidCameraEmbedSettings = {
  photosFolder: "",
  createFolderIfMissing: true,
};

export default class AndroidCameraEmbedPlugin extends Plugin {
  settings: AndroidCameraEmbedSettings = DEFAULT_SETTINGS;

  async onload() {
    // Load persisted settings before wiring UI.
    await this.loadSettings();

    this.addSettingTab(new AndroidCameraEmbedSettingTab(this.app, this));

    // Register custom camera icon with viewBox 0 0 100 100 (required by Obsidian)
    addIcon(
      "android-camera",
      '<svg viewBox="0 0 100 100"><path fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="M81 79H19c-4 0-8-4-8-8V33c0-4 4-8 8-8h13l6-10h24l6 10h13c4 0 8 4 8 8v38c0 4-4 8-8 8Z"/><circle fill="none" stroke="currentColor" stroke-width="6" cx="50" cy="52" r="17"/></svg>'
    );

    this.addRibbonIcon("android-camera", "Capture photo", () => {
      void this.captureAndEmbed();
    });

    this.addCommand({
      id: "capture-photo-embed",
      name: "Capture photo and embed",
      icon: "android-camera",
      callback: () => {
        void this.captureAndEmbed();
      },
    });
  }

  private async captureAndEmbed() {
    // Ensure there's an active markdown editor to insert the image.
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice("Open a markdown note to insert the photo.");
      return;
    }

    const activeFile = view.file;
    if (!activeFile) {
      new Notice("No active note to insert the photo.");
      return;
    }

    // Open the device camera and let the user capture a photo.
    const file = await this.pickImageFromCamera();
    if (!file) {
      return;
    }

    // Save the photo into the vault.
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

    // Insert a markdown embed for the saved image.
    const link = this.app.fileManager.generateMarkdownLink(created, activeFile.path);
    view.editor.replaceSelection(`!${link}`);
  }

  private pickImageFromCamera(): Promise<File | null> {
    return new Promise((resolve) => {
      // Mobile browsers use the capture attribute to open the camera.
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.style.display = "none";

      const timeoutId = window.setTimeout(() => {
        input.remove();
        resolve(null);
      }, 60_000);

      const cleanup = (file: File | null) => {
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

  private buildFileName(file: File): string {
    // Use an ISO timestamp to keep filenames sortable.
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fallbackExt = this.extensionFromType(file.type) ?? "jpg";
    const ext = this.extensionFromName(file.name) ?? fallbackExt;
    return `photo-${stamp}.${ext}`;
  }

  private extensionFromName(name: string): string | null {
    const match = name.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1] : null;
  }

  private extensionFromType(mimeType: string): string | null {
    if (!mimeType.startsWith("image/")) {
      return null;
    }
    const subtype = mimeType.split("/")[1];
    if (!subtype) {
      return null;
    }
    return subtype.replace("jpeg", "jpg");
  }

  private joinPath(parentPath: string, fileName: string): string {
    if (!parentPath) {
      return fileName;
    }
    return `${parentPath}/${fileName}`;
  }

  private getAvailablePath(path: string): string {
    // Avoid overwriting existing files by adding a suffix.
    if (!this.app.vault.getAbstractFileByPath(path)) {
      return path;
    }

    const parts = path.split("/");
    const name = parts.pop() ?? path;
    const dir = parts.length > 0 ? `${parts.join("/")}/` : "";
    const extIndex = name.lastIndexOf(".");
    const base = extIndex === -1 ? name : name.slice(0, extIndex);
    const ext = extIndex === -1 ? "" : name.slice(extIndex);

    for (let i = 1; i < 1000; i += 1) {
      const candidate = `${dir}${base}-${i}${ext}`;
      if (!this.app.vault.getAbstractFileByPath(candidate)) {
        return candidate;
      }
    }

    return `${dir}${base}-${Date.now()}${ext}`;
  }

  private async ensureTargetFolder(parent: TFolder): Promise<string | null> {
    // Resolve the destination folder based on settings.
    const rawPath = this.settings.photosFolder.trim();
    if (!rawPath) {
      return parent.path;
    }

    const normalized = normalizePath(rawPath);
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (existing instanceof TFolder) {
      return existing.path;
    }

    if (!this.settings.createFolderIfMissing) {
      new Notice(`Folder not found: ${normalized}`);
      return null;
    }

    try {
      // Create the folder tree if desired.
      await this.app.vault.createFolder(normalized);
      return normalized;
    } catch (error) {
      new Notice(`Failed to create folder: ${normalized}`);
      return null;
    }
  }

  private async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class AndroidCameraEmbedSettingTab extends PluginSettingTab {
  plugin: AndroidCameraEmbedPlugin;

  constructor(app: App, plugin: AndroidCameraEmbedPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Android only")
      .setDesc("This plugin is intended for Android and is not supported on iOS or desktop.");

    new Setting(containerEl)
      .setName("Photos folder")
      .setDesc(
        "Optional. Use a vault-relative path like Attachments/Camera. Leave blank to store next to the note."
      )
      .addText((text) =>
        text
          .setPlaceholder("Attachments/Camera")
          .setValue(this.plugin.settings.photosFolder)
          .onChange(async (value) => {
            this.plugin.settings.photosFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Create folder if missing")
      .setDesc("Automatically create the photos folder if it does not exist.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.createFolderIfMissing)
          .onChange(async (value) => {
            this.plugin.settings.createFolderIfMissing = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
