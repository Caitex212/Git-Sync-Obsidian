import { PluginSettingTab, Setting, App, Plugin } from 'obsidian';
import { Notice } from 'obsidian';
import { exec } from 'child_process';

interface GitSettings {
    gitLink: string;
    username: string;
    gitKey: string;
    gitFolderPath: string;
}

const DEFAULT_SETTINGS: GitSettings = {
    gitLink: '',
    username: '',
    gitKey: '',
    gitFolderPath: ''
}

export default class GitIntegrationPlugin extends Plugin {
    settings: GitSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('push-pull', 'Push & Pull', async () => {
            await this.commitAndPush();
            await this.pullChanges();
        });

        this.addCommand({
            id: 'commit-and-push',
            name: 'Commit & Push',
            callback: async () => {
                await this.commitAndPush();
            }
        });

        this.addCommand({
            id: 'pull',
            name: 'Pull Changes',
            callback: async () => {
                await this.pullChanges();
            }
        });

        this.addCommand({
            id: 'set-git-merge',
            name: 'Set Git Merge',
            callback: async () => {
                await this.setGitMerge();
            }
        });

        this.addCommand({
            id: 'set-git-rebase',
            name: 'Set Git Rebase',
            callback: async () => {
                await this.setGitRebase();
            }
        });

        this.addSettingTab(new GitSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async commitAndPush() {
        try {
            const now = new Date();
            const commitMessage = `Commit on ${now.toISOString()}`;
            new Notice('Starting commit & push (1/2)');
            const gitCredentials = `${this.settings.username}:${this.settings.gitKey}`;
            await this.executeGitCommand(`cd ${this.settings.gitFolderPath} && git add . && git commit -m "${commitMessage}" && git push https://${gitCredentials}@${this.settings.gitLink}`);
            new Notice('Commit and push successful! (2/2)');
        } catch (error) {
            console.error("Error executing Git command:", error);
            new Notice('An error occurred while committing and pushing.:'+ error, 5000);
        }
    }

    async pullChanges() {
        try {
            const gitCredentials = `${this.settings.username}:${this.settings.gitKey}`;
            new Notice('Starting pull (1/2)');
            await this.executeGitCommand(`cd ${this.settings.gitFolderPath} && git pull https://${gitCredentials}@${this.settings.gitLink}`);
            new Notice('Pull successful! (2/2)');
        } catch (error) {
            console.error("Error executing Git command:", error);
            new Notice('An error occurred while pulling changes.:'+ error, 5000);
        }
    }
    
    async setGitMerge() {
        try {
            new Notice('Setting Git merge (1/1)');
            await this.executeGitCommand(`cd ${this.settings.gitFolderPath} && git config pull.rebase false`);
            new Notice('Git merge set successfully! (1/2)');
        } catch (error) {
            console.error("Error setting Git merge:", error);
            new Notice('An error occurred while setting Git merge:'+ error, 5000);
        }
    }

    async setGitRebase() {
        try {
            new Notice('Setting Git rebase (1/1)');
            await this.executeGitCommand(`cd ${this.settings.gitFolderPath} && git config pull.rebase true`);
            new Notice('Git rebase set successfully! (1/2)');
        } catch (error) {
            console.error("Error setting Git rebase:", error);
            new Notice('An error occurred while setting Git rebase:'+ error, 5000);
        }
    }

    async executeGitCommand(command: string): Promise<void> {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Command stderr: ${stderr}`);
                return;
            }
            console.log(`Command output: ${stdout}`);
        });
    }
}

class GitSettingTab extends PluginSettingTab {
    plugin: GitIntegrationPlugin;

    constructor(app: App, plugin: GitIntegrationPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Repo Link')
            .setDesc('Enter the Git repository link')
            .addText(text => text
                .setPlaceholder('github.com/username/repository')
                .setValue(this.plugin.settings.gitLink)
                .onChange(async (value) => {
                    this.plugin.settings.gitLink = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Username')
            .setDesc('Enter your Git username')
            .addText(text => text
                .setPlaceholder('username')
                .setValue(this.plugin.settings.username)
                .onChange(async (value) => {
                    this.plugin.settings.username = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Git Key')
            .setDesc('Enter your Git access token or password')
            .addText(text => text
                .setPlaceholder('Git key')
                .setValue(this.plugin.settings.gitKey)
                .onChange(async (value) => {
                    this.plugin.settings.gitKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Git Folder Path')
            .setDesc('Enter the path to your Git repository folder')
            .addText(text => text
                .setPlaceholder('/path/to/your/git/folder')
                .setValue(this.plugin.settings.gitFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.gitFolderPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}
