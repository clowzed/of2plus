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

function of2plus_choosed_build_button(context: vscode.ExtensionContext) {
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	baritem.text = `Version: ${misc.config_manager.choosed_version()} Platform: ${misc.config_manager.choosed_platform()}`;

	baritem.show();
	context.subscriptions.push(baritem);
	return baritem;
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


export async function activate(context: vscode.ExtensionContext) {
	//? Place build button to bottom
	of2plus_buildbutton(context);

	let choosed_build_button = of2plus_choosed_build_button(context);

	let build = vscode.commands.registerCommand('of2plus.build', async () => {
		let build = misc.config_manager.current_build();
		if (build === undefined) {
			return;
		}

		fs.writeFileSync(misc.global_bashrc, ". " + build.bashrc_path);

		await misc.execute(`wmake ${misc.workspace()}`);
	});

	let choose_build = vscode.commands.registerCommand('of2plus.choose_build', async () => {
		let builds = misc.config_manager.builds()
		if (builds.length === 0) { return; }

		let builds_strings = builds.map((build) => `Version: ${build.version} Platform: ${build.platform}`);

		let choosed_build = await misc.popup_manager.quickpick(builds_strings, "Choose openfoam build");

		if ((builds_strings.filter((build) => build === choosed_build)).length === 0) { return }

		let build = builds[builds_strings.indexOf(choosed_build)];

		misc.config_manager.set_version(build.version);
		misc.config_manager.set_platform(build.platform);
	})


	//? On startup we check if our bashrc 
	//? is already in /etc/bashrc
	//? If not we create out own bashrc in 
	//? extension folder
	//? Before build we place activation of
	//? bashrc we need inside this file
	//! requires sudo access

	let bashrc_data = fs.readFileSync('/etc/bashrc');

	//? Check if we already modified /etc/bashrc
	if (!("export LD_LIBRARY_PATH" in bashrc_data)) {
		let command = ". " + misc.global_bashrc.toString() + '\nexport LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/local/lib:/usr/lib:/usr/local/lib64:/usr/lib64"\n >> /etc/bashrc';

		sudo.exec(command, { name: "of2plus: update bashrc" }, (err) => {
			if (err) {
			}
		});

	}

	let foldergen = vscode.commands.registerCommand("of2plus.genfolders", of2plus_foldergen);
	let download_prebuilds = vscode.commands.registerCommand("of2plus.downloadOF", of2plus_download_prebuilds);

	context.subscriptions.push(build);
	context.subscriptions.push(foldergen);
	context.subscriptions.push(download_prebuilds);
}

export function deactivate() {
}
