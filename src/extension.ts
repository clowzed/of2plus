import * as fs from 'fs';
import * as helps from "./helpers";
import * as http from 'http';
import * as path from 'path';
import * as targz from 'targz';
import * as vscode from 'vscode';
import { ConfigurationManager, Build } from './managers/config-manager';
import Path from 'pathlib-js';
import * as sudo from 'sudo-prompt';
import * as misc from './misc';
import { OFPrebuildsHostingApi } from './hosting-api';


function of2plus_buildbutton(context: vscode.ExtensionContext) {
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	baritem.command = "of2plus.build";
	baritem.text = "Build with wmake";

	baritem.show();
	context.subscriptions.push(baritem);
}

function of2plus_foldergen() {

	let workspace = misc.workspace();

	let required_folders = ["applications", "bin",
		"doc", "etc",
		"lib", "src",
		"tutorials",
		"applications/bin",
		"applications/solvers",
		"applications/test",
		"applications/utilities",
		"doc/Doxygen",
		"Make",
		".vscode"];

	let required_files = ["Make/files",
		"Make/options",
		".vscode/bashrc",
		".vscode/settings.json"];

	required_folders.forEach(name => {
		let folder_path = path.join(workspace, name);
		if (!fs.existsSync(folder_path)) { vscode.workspace.fs.createDirectory(vscode.Uri.file(folder_path)); }

	});


	//? This section generates files
	const edit = new vscode.WorkspaceEdit();

	required_files.forEach(name => {
		let file_path = path.join(workspace, name);

		if (!fs.existsSync(file_path)) {
			edit.createFile(vscode.Uri.file(file_path));
			vscode.workspace.applyEdit(edit);
		}
	});

	vscode.commands.executeCommand('of2plus.intellisense')
}

async function of2plus_activate_intellisense() {

	let settings_json = misc.workspace() + "/.vscode/settings.json";

	if (fs.existsSync(settings_json)) {
		try {
			var config = JSON.parse(fs.readFileSync(settings_json, 'utf8')) || {};
		}
		catch (e) {
			var config: any = {};
		}

		if (config["files.associations"] === undefined) {
			config["files.associations"] = {};
		}
		config["files.associations"]["*.C"] = "cpp";
		config["files.associations"]["*.H"] = "cpp";

		fs.writeFileSync(settings_json, JSON.stringify(config));

	}
	else {
		return;
	}

	let settings = misc.workspace() + "/.vscode/c_cpp_properties.json";


	vscode.commands.executeCommand('C_Cpp.ResetDatabase').then(() => {
		vscode.commands.executeCommand('C_Cpp.ConfigurationEditJSON').then(() => {
			vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {


				let config = JSON.parse(fs.readFileSync(settings, 'utf8')) || {};

				config['configurations'][0]['includePath'].push("~/of2plus-important/**");
				config['configurations'][0]['includePath'].push("/usr/include/**");

				if (!config['configurations'][0]['compilerPath'].includes("g++")) {
					config['configurations'][0]['compilerPath'] = '/usr/local/bin/g++';
				}

				fs.writeFileSync(settings, JSON.stringify(config));
			});


		});
	})
		.then(() => {
			vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});

}

async function of2plus_download_prebuilds(context: vscode.ExtensionContext) {

	let identifier = await misc.popup_manager.ask("123-456-789", "Type your identifier", "");
	let url = await misc.popup_manager.ask("https://...", "type server domain", "");

	if (identifier === "" || url === "") {
		return;
	}
	else {
		let api = new OFPrebuildsHostingApi(url, identifier);
		let versions = await api.versions();

		if (versions?.length === 0) { return; }

		let version = await misc.popup_manager.quickpick(versions, "Choose version of OpenFOAM") || "";

		let platforms = await api.platforms_for(version);

		if (platforms?.length === 0) { return; }

		let platform = await misc.popup_manager.quickpick(platforms, "Choose platform") || "";

		if (misc.config_manager.get(version, platform) !== undefined) {
			return;
		}

		if (!api.exists(version, platform)) {
			return;
		}

		api.download_and_install(version, platform, identifier);
	}
};





export function activate(context: vscode.ExtensionContext) {
	//? Adding bar buttons
	let version_choosed = of2PlusInitializeASourceBarButton(context);
	of2PlusInitializeBuildBarButton(context);
	of2PlusInitializeAIntellisenseBarButton(context);

	//? Simple activation command
	let activation = vscode.commands.registerCommand('of2plus.activate', () => {
		helps.info("Of2plus extension is activated!");
	});

	//? This builds with wmake
	let disposable = vscode.commands.registerCommand('of2plus.build', async () => {
		helps.info("Build was started!");
		await helps.spawnRedirected(`wmake ${misc.workspace()}`, helps.outputChannel("wmake build"), helps.outputChannel("wmake build"));
		helps.info("Build finished");
	});


	//? Loads environment
	let loadBashrc = vscode.commands.registerCommand("of2plus.loadbashrc", async () => {
		if (!fs.existsSync(misc.workspace() + "/.vscode/bashrc")) {
			helps.error("Run of2plus: Generate standart folder structure!");
			return;
		}

		let builds = configManager.builds();

		if (builds === undefined) {
			helps.info("No builds were found");
			return;
		}

		let versions = builds.map((build: { version: string }) => build['version']);
		let platforms = builds.map((build: { platform: string }) => build['platform']);

		let version = await helps.quickpick(versions, "Choose version of OpenFOAM") || "";
		let platform = await helps.quickpick(platforms, "Choose platform of OpenFOAM") || "";


		let build = configManager.find(version, platform);

		fs.writeFileSync(misc.workspace() + "/.vscode/bashrc", ". " + configManager.find(version, platform)[0]["bashrc"] + '\nexport LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/local/lib:/usr/lib:/usr/local/lib64:/usr/lib64"\n');
		version_choosed.text = `OpenFOAM: version: ${version} platform: ${platform}`;

	});

	sudo.exec(`echo ". ${misc.workspace() + "/.vscode/bashrc"}" >> /etc/bashrc`, { name: "Of2plus update bashrc" }, (err) => {
		if (err) {
			helps.error(err.message);
			helps.error("Error occured while activating bashrc!");
		}
	});


	let foldersInit = vscode.commands.registerCommand("of2plus.genfolders", of2PlusGenerateStandartFoldersAndFiles);
	let foamLoad = vscode.commands.registerCommand("of2plus.downloadOF", of2plusDownloadPrebuilds);
	let intellisense = vscode.commands.registerCommand("of2plus.activateIntellisense", intellisenseActivation);


	context.subscriptions.push(disposable);
	context.subscriptions.push(foldersInit);
	context.subscriptions.push(activation);
	context.subscriptions.push(foamLoad);
	context.subscriptions.push(loadBashrc);
	context.subscriptions.push(intellisense);
}

export function deactivate() {
	helps.info("of2plus extension is deactivated!");
}
