/* eslint-disable @typescript-eslint/naming-convention */
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as misc from './misc';
import { OFPrebuildsHostingApi } from './hosting-api';
import Path from 'pathlib-js';
import { version } from 'os';




function of2plus_choosed_build_button(context: vscode.ExtensionContext) {
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	baritem.text = `Version: ${misc.config_manager.choosed_version()} Platform: ${misc.config_manager.choosed_platform()}`;

	baritem.show();
	context.subscriptions.push(baritem);
	return baritem;
}


async function of2plus_foldergen() {

	misc.information("Generating standart folder structure and activating intellisense...");

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
		"constant",
		"system",
		".vscode"];

	let required_files = ["Make/files",
		"Make/options",
		".vscode/settings.json",
		".vscode/of2plus.json"];

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

	of2plus_activate_intellisense();
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

	misc.information("Enter valid identifier for downloading.");

	misc.popup_manager.ask("123-456-789", "Enter your identifier", "").then((value) => {

		let identifier = value || "";
		misc.information(`Identifier: ${identifier}`);

		if (identifier === "") {
			misc.error("We can not download OpenFoam prebuilds without valid identifier due to download protection! Contact with hosting admin to recieve valid identifier");
		}
		else {
			misc.popup_manager.ask("https://...", "Enter server domain or press enter for default server", "").then(
				(value) => {
					let server = value || "http:/egorych.aero:16143";

					let api = new OFPrebuildsHostingApi(server, identifier);

					let versions = api.versions();

					if (versions.length === 0) {
						misc.error("No available version were found on the server!");
					}
					else {
						// @ts-ignore
						misc.popup_manager.quickpick(versions, "Choose version of OpenFOAM").then((version) => {
							if (version === "" || version === undefined) {
								misc.error("Version was not choosed!");
							}
							else {
								if (!versions.includes(version)) {
									misc.error("We cannot download build without knowing OpenFoam version you need!");
								}
								else {
									let platforms = api.platforms_for(version);

									if (platforms.length === 0) {
										misc.error("No platforms were found for this version!");
									}
									else {
										// @ts-ignore
										misc.popup_manager.quickpick(platforms, "Choose platform").then(
											(platform) => {
												if (platform === "" || platform === undefined) {
													misc.error("No platform was choosed");
												}
												else {
													if (!platforms.includes(platform)) {
														misc.error("We cannot download build without knowing platform!");
													}
													else {
														if (misc.config_manager.installed(version, platform)) {
															misc.warning(`OpenFoam build version ${version}: platform : ${platform} is already downloaded!`);
														}
														else {
															api.download_and_install(version, platform, identifier).then((error_occured) => {
																if (error_occured) {
																	misc.error("Error occured while downloading and installing Openfoam build!");
																}
																else {
																	misc.information("OpenFoam was succeasfully installed!");
																}
															}
															);
														}
													}
												}
											}
										);
									}

								}
							}
						});
					}

				}
			);
		}
	}
	);
};


export async function activate(context: vscode.ExtensionContext) {

	let choosed_build_button = of2plus_choosed_build_button(context);

	let build = vscode.commands.registerCommand('of2plus.build', () => {

		let build = misc.config_manager.current_build();

		if (build === undefined) {
			misc.error("You have not choosed openfoam build yet! Run 'of2plus: Choose build'");
			return;
		}

		misc.channels_manger.cinformation('of2plus', "Building...");

		let command = `LD_LIBRARY_PATH=$LD_LIBRARY_PATH:${build.installation_path}/other:/usr/local/lib:/usr/lib:/usr/local/lib64:/usr/lib64 bash -c '. ${build.bashrc_path} && wmake ${misc.workspace()}'`;
		misc.execute(command);
	});


	let choose_build = vscode.commands.registerCommand('of2plus.choose_build', async () => {
		let builds = misc.config_manager.builds();

		if (builds.length === 0) {
			misc.error("No installed build were found! Run 'of2plus: Download OpenFoam'");
			return;
		}

		let builds_strings = builds.map((build) => `Version: ${build.version} Platform: ${build.platform}`);


		// @ts-ignore Thinks that builds_strings has less than 1 element
		let choosed_build = await misc.popup_manager.quickpick(builds_strings, "Choose openfoam build") || "";

		misc.channels_manger.cinformation("of2plus", `User choosed: ${choosed_build}`);

		if (choosed_build === "") {
			misc.error("Please select your build!");
			return;
		}

		let build = builds[builds_strings.indexOf(choosed_build)];

		misc.config_manager.set_version(build.version);
		misc.config_manager.set_platform(build.platform);

		misc.information("New build was saved!");

		choosed_build_button.text = `Version: ${build.version} Platform: ${build.platform}`;

	});

	let run_from_folder = vscode.commands.registerCommand('of2plus.run', async () => {
		let build = misc.config_manager.current_build();

		if (build === undefined) {
			misc.error("You have not choosed openfoam build yet! Run 'of2plus: Choose build'");
			return;
		}

		let command = `bash -c '. ${build.bashrc_path} && echo $FOAM_USER_APPBIN'`;
		let folder = new Path((await misc.execute(command)).trim());


		if (!folder.existsSync()) {
			misc.error("FOAM_USER_APPBIN is empty! Some error occured!");
			return;
		}
		else {
			let executables = folder.readDirSync();
			if (executables.length === 0) {
				misc.error("No executables were found in FOAM_USER_APPBIN");
				return;
			}
			let executables_for_choosing = executables.map((path) => path.stem);
			// @ts-ignore Thinks that [] has less than 1 element
			let choosed_executable = await misc.popup_manager.quickpick(executables_for_choosing, "Choose executable to run:");

			// escape check
			if (choosed_executable === undefined) { return; };

			let exepath = executables[executables_for_choosing.indexOf(choosed_executable)];

			let command = `LD_LIBRARY_PATH=$LD_LIBRARY_PATH:${build.installation_path}/other:/usr/local/lib:/usr/lib:/usr/local/lib64:/usr/lib64 bash -c '. ${build.bashrc_path} && ${exepath}'`;

			misc.channels_manger.cinformation('of2plus', await misc.execute(command));

		}

	});

	let foldergen = vscode.commands.registerCommand("of2plus.genfolders", of2plus_foldergen);
	let download_prebuilds = vscode.commands.registerCommand("of2plus.downloadOF", of2plus_download_prebuilds);

	context.subscriptions.push(build);
	context.subscriptions.push(foldergen);
	context.subscriptions.push(download_prebuilds);
	context.subscriptions.push(choose_build);
	context.subscriptions.push(run_from_folder);
}

export function deactivate() { }
