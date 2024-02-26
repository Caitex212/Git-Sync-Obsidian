import { PluginSettingTab, Setting, App, Plugin } from 'obsidian';
import { Notice } from 'obsidian';
import { exec } from 'child_process';

interface RepoSettings {
    gitLink: string;
    username: string;
    gitKey: string;
    gitFolderPath: string;
    pushEnabled: boolean;
    pullEnabled: boolean;
}

interface GitSettings {
    repos: RepoSettings[];
}

const DEFAULT_REPO_SETTINGS: RepoSettings = {
    gitLink: '',
    username: '',
    gitKey: '',
    gitFolderPath: '',
    pushEnabled: true,
    pullEnabled: true,
};

const DEFAULT_SETTINGS: GitSettings = {
    repos: [Object.assign({}, DEFAULT_REPO_SETTINGS)],
};

export default class GitIntegrationPlugin extends Plugin {
    settings: GitSettings;

    async onload() {
        await this.loadSettings();

        this.addCommand({
            id: 'commit-and-push',
            name: 'Commit & Push',
            callback: async () => {
                await this.commitAndPushAll();
            }
        });

        this.addCommand({
            id: 'pull',
            name: 'Pull Changes',
            callback: async () => {
                await this.pullAll();
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

    async commitAndPushAll() {
        for (const repo of this.settings.repos) {
            if (repo.pushEnabled) await this.commitAndPush(repo);
        }
    }

    async pullAll() {
        for (const repo of this.settings.repos) {
            if (repo.pullEnabled) await this.pullChanges(repo);
        }
    }

    async commitAndPush(repo: RepoSettings) {
        try {
            const now = new Date();
            const commitMessage = `Commit on ${now.toISOString()}`;
            new Notice(`Starting commit & push for ${repo.gitLink}`);
            const gitCredentials = `${repo.username}:${repo.gitKey}`;
            await this.executeGitCommand(`cd ${repo.gitFolderPath} && git add . && git commit -m "${commitMessage}" && git push https://${gitCredentials}@${repo.gitLink}`);
            new Notice(`Commit and push for ${repo.gitLink} successful!`);
        } catch (error) {
            console.error(`Error executing Git command for ${repo.gitLink}:`, error);
            new Notice(`An error occurred while committing and pushing for ${repo.gitLink}: ${error}`, 5000);
        }
    }

    async pullChanges(repo: RepoSettings) {
        try {
            const gitCredentials = `${repo.username}:${repo.gitKey}`;
            new Notice(`Starting pull for ${repo.gitLink}`);
            await this.executeGitCommand(`cd ${repo.gitFolderPath} && git pull https://${gitCredentials}@${repo.gitLink}`);
            new Notice(`Pull for ${repo.gitLink} successful!`);
        } catch (error) {
            console.error(`Error executing Git command for ${repo.gitLink}:`, error);
            new Notice(`An error occurred while pulling changes for ${repo.gitLink}: ${error}`, 5000);
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

        for (let i = 0; i < this.plugin.settings.repos.length; i++) {
            this.displayRepoSettings(containerEl, i);
        }

        new Setting(containerEl)
            .setName('Add Repository')
            .setDesc('Add a new repository to manage')
            .addButton(button => button.setButtonText('Add').onClick(() => {
                this.plugin.settings.repos.push(Object.assign({}, DEFAULT_REPO_SETTINGS));
                this.displayRepoSettings(containerEl, this.plugin.settings.repos.length - 1);
                this.plugin.saveSettings();
            }));
    }

    displayRepoSettings(containerEl: HTMLElement, index: number): void {
        const repo = this.plugin.settings.repos[index];
        const repoContainer = containerEl.createDiv();

        const toggleButton = repoContainer.createEl('button');
        toggleButton.textContent = `Repository ${index + 1}`;
        toggleButton.className = 'repo-toggle';
        toggleButton.onclick = () => {
            repoDetails.classList.toggle('repo-details-hidden');
        };

        const repoDetails = containerEl.createDiv();
        repoDetails.className = 'repo-details';

        new Setting(repoDetails)
            .setName('Configure repository settings')
            .addButton(button => button.setButtonText('Remove').onClick(() => {
                this.plugin.settings.repos.splice(index, 1);
                this.display();
                this.plugin.saveSettings();
            }));

        new Setting(repoDetails)
            .setName('Repo Link')
            .setDesc('Enter the Git repository link')
            .addText(text => text
                .setPlaceholder('github.com/username/repository')
                .setValue(repo.gitLink)
                .onChange(async (value) => {
                    repo.gitLink = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(repoDetails)
            .setName('Username')
            .setDesc('Enter your Git username')
            .addText(text => text
                .setPlaceholder('username')
                .setValue(repo.username)
                .onChange(async (value) => {
                    repo.username = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(repoDetails)
            .setName('Git Key')
            .setDesc('Enter your Git access token or password')
            .addText(text => text
                .setPlaceholder('Git key')
                .setValue(repo.gitKey)
                .onChange(async (value) => {
                    repo.gitKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(repoDetails)
            .setName('Git Folder Path')
            .setDesc('Enter the path to your Git repository folder')
            .addText(text => text
                .setPlaceholder('/path/to/your/git/folder')
                .setValue(repo.gitFolderPath)
                .onChange(async (value) => {
                    repo.gitFolderPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(repoDetails)
            .setName('Push')
            .addButton(button => button.setButtonText('Push').onClick(() => {
                this.plugin.commitAndPush(repo);
            }));

        new Setting(repoDetails)
            .setName('Pull')
            .addButton(button => button.setButtonText('Pull').onClick(() => {
                this.plugin.pullChanges(repo);
            }));

        new Setting(repoDetails)
            .setName('Push Enabled')
            .addToggle(toggle => toggle
                .setValue(repo.pushEnabled)
                .onChange(async (value) => {
                    repo.pushEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(repoDetails)
            .setName('Pull Enabled')
            .addToggle(toggle => toggle
                .setValue(repo.pullEnabled)
                .onChange(async (value) => {
                    repo.pullEnabled = value;
                    await this.plugin.saveSettings();
                }));
                
        repoDetails.classList.add('repo-details-hidden');
    }
}