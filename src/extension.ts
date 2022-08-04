import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
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


function of2plus_choosed_build_button(context: vscode.ExtensionContext) {
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	baritem.text = `Version: ${misc.config_manager.choosed_version()} Platform: ${misc.config_manager.choosed_platform()}`;

	baritem.show();
	context.subscriptions.push(baritem);
	return baritem;
}


async function of2plus_foldergen() {

	misc.information("Gemerating standart folder structure and activating intellisense...");

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

	misc.information("Folders and files for standart folder structure was sucesfully generated!");

	await vscode.commands.executeCommand('of2plus.intellisense')
}


async function of2plus_activate_intellisense() {

	misc.information("Activating intellisense...");

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
		misc.error("settings.json file was not found! Run 'of2plus: Generate standart folder structure.'");
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

	misc.information("Intellisense was succesfully activated!");
}


async function of2plus_download_prebuilds(context: vscode.ExtensionContext) {

	// TODO Add checking server protocol

	misc.information("Enter valid identifier for downloading.");
	let identifier = await misc.popup_manager.ask("123-456-789", "Enter your identifier", "") || "";

	misc.information("Enter server domain from which to download");

	let url = await misc.popup_manager.ask("https://...", "Enter server domain", "") || "http://egorych.aero:16143";

	let api = new OFPrebuildsHostingApi(url, identifier);

	if (identifier === "") {
		misc.error("We can not download OpenFoam prebuilds without valid due to download protection! Contact with hosting admin to recieve valid identifier");
		return;
	}
	else if (url === "") {
		misc.error("We can not download OpenFoam prebuilds without knowing from where to download.");
		return;
	}
	else {
		misc.channels_manger.cinformation("of2plus", "Asking server for versions...");

		let versions = await api.versions();
		console.log(versions);

		misc.channels_manger.cinformation("of2plus", `Versions amount: ${versions.length}`);

		if (versions?.length === 0) {
			misc.error("There are no available versions on hosting. Contact with administartor!");
			return;
		}

		misc.channels_manger.cinformation("of2plus", `Asking for version...`);

		let version = await misc.popup_manager.quickpick(versions, "Choose version of OpenFOAM") || "";

		misc.channels_manger.cinformation("of2plus", `User choosed: ${version}`);

		if (!versions.includes(version)) {
			misc.error("We cannot download build without knowing OpenFoam version you need!");
			return;
		}

		misc.channels_manger.cinformation("of2plus", "Asking server for platforms...");

		let platforms = await api.platforms_for(version);

		if (platforms?.length === 0) {
			misc.error(`There are no available platforms for version: ${version} on hosting. Contact with administartor!`);
			return;
		}

		misc.channels_manger.cinformation("of2plus", `Asking for platform...`);

		let platform = await misc.popup_manager.quickpick(platforms, "Choose platform") || "";

		misc.channels_manger.cinformation("of2plus", `User choosed: ${platform}`);

		if (!platforms.includes(platform)) {
			misc.error("We cannot download build without knowing build platform you need!");
			return;
		}

		if (misc.config_manager.installed(version, platform)) {
			misc.warning(`OpenFoam build version ${version}: platform : ${platform} is already downloaded!`);
		}

		if (!api.exists(version, platform)) {
			misc.error("Server responded that there was no such build. It must be a bug. Contact with admin.");
			return;
		}

		if (await api.download_and_install(version, platform, identifier)) {
			misc.error("Error occured while downloading prebuild. Check output for more information!");
		}
	}
};


export async function activate(context: vscode.ExtensionContext) {

	of2plus_buildbutton(context);

	let choosed_build_button = of2plus_choosed_build_button(context);

	let build = vscode.commands.registerCommand('of2plus.build', async () => {

		let build = misc.config_manager.current_build();

		if (build === undefined) {
			misc.error("You have not choosed openfoam build yet! Run 'of2plus: Choose build'");
			return;
		}

		misc.channels_manger.cinformation('of2plus', "Rewriting global bashrc...");

		fs.writeFileSync(misc.global_bashrc.toString(), ". " + build.bashrc_path);

		misc.channels_manger.cinformation('of2plus', "Building...");
		await misc.execute(`wmake ${misc.workspace()}`);
	});


	let choose_build = vscode.commands.registerCommand('of2plus.choose_build', async () => {
		let builds = misc.config_manager.builds()

		if (builds.length === 0) {
			misc.error("No installed build were found! Run 'of2plus: Download OpenFoam'");
			return;
		}

		let builds_strings = builds.map((build) => `Version: ${build.version} Platform: ${build.platform}`);

 
		// @ts-ignore Thinks that builds_strings has less than 1 element
		let choosed_build = await misc.popup_manager.quickpick(builds_strings, "Choose openfoam build") || "";

		misc.channels_manger.cinformation("of2plus", `User choosed: ${choosed_build}`);

		if (choosed_build === "")
		{
			misc.error("Please select your build!");
			return; 
		}

		let build = builds[builds_strings.indexOf(choosed_build)];

		misc.config_manager.set_version(build.version);
		misc.config_manager.set_platform(build.platform);

		misc.information("New build was saved!");
		
	});


	//? On startup we check if our bashrc 
	//? is already in /etc/bashrc
	//? If not we create out own bashrc in 
	//? extension folder
	//? Before build we place activation of
	//? bashrc we need inside this file
	//! requires sudo access

	let bashrc_data = fs.readFileSync('/etc/bash.bashrc');


	//? Check if we've already modified /etc/bashrc
	if (!("export LD_LIBRARY_PATH" in bashrc_data)) {
		let command = ". " + misc.global_bashrc.toString() + '\nexport LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/local/lib:/usr/lib:/usr/local/lib64:/usr/lib64"\n >> /etc/bashrc';

		sudo.exec(command, { name: "of2plus update bashrc" }, (err) => {
			if (err) {
				misc.error(`Error occured while modifying bashrc! Reason : ${err.message}`);
			}
		});

	}

	let foldergen = vscode.commands.registerCommand("of2plus.genfolders", of2plus_foldergen);
	let download_prebuilds = vscode.commands.registerCommand("of2plus.downloadOF", of2plus_download_prebuilds);

	context.subscriptions.push(build);
	context.subscriptions.push(foldergen);
	context.subscriptions.push(download_prebuilds);
}

export function deactivate() { }
