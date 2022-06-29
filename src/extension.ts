import * as fs from 'fs';
import * as helps from "./helpers";
import * as http from 'http';
import * as path from 'path';
import * as targz from 'targz';
import * as vscode from 'vscode';
import { ConfigurationManager, Build } from './config-manager';
import Path from 'pathlib-js';
import * as sudo from 'sudo-prompt';

//? Creating home dir for files
let extFolder_ = new Path(helps.homeDirectory() + "/of2plus-important");

if (!extFolder_.existsSync()) {
	extFolder_.makeDirSync();
}

let extFolder = new Path(helps.homeDirectory() + "/of2plus-important");
let installedConfig = new Path(extFolder.toString() + "/installed.json");

let configManager = new Manager(installedConfig);


// * Here we define functions which add buttons to status bar

//* Status: Finished
function of2PlusInitializeBuildBarButton(context: vscode.ExtensionContext) {
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	baritem.command = "of2plus.build";
	baritem.text = "Build with wmake";

	baritem.show();
	context.subscriptions.push(baritem);
}


//* Status: Finished
function of2PlusInitializeASourceBarButton(context: vscode.ExtensionContext) {
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	baritem.command = "of2plus.loadbashrc";
	baritem.text = "Activate environment";

	baritem.show();
	context.subscriptions.push(baritem);
	return baritem;
}


//* Status: Finished
function of2PlusInitializeAIntellisenseBarButton(context: vscode.ExtensionContext) {
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

	baritem.command = "of2plus.activateIntellisense";
	baritem.text = "Activate Intellisense";

	baritem.show();
	context.subscriptions.push(baritem);
}


//* Status: Finished
//? This function generates standart folder structure
function of2PlusGenerateStandartFoldersAndFiles() {

	helps.info("Generating standart folder structure...");

	let rootFolder = helps.workspaceFolder();


	let foldersNames = ["applications", "bin",
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

	let fileNames = ["Make/files",
		"Make/options",
		".vscode/bashrc",
		".vscode/settings.json"];


	//? This section generates folders
	foldersNames.forEach(folderName => {
		let fullFolderPath = path.join(rootFolder, folderName);

		if (!fs.existsSync(fullFolderPath)) { vscode.workspace.fs.createDirectory(vscode.Uri.file(fullFolderPath)); }

	});


	//? This section generates files
	const workspaceEdit = new vscode.WorkspaceEdit();

	fileNames.forEach(fileName => {
		let fullFilePath = path.join(rootFolder, fileName);

		if (!fs.existsSync(fullFilePath)) {
			workspaceEdit.createFile(vscode.Uri.file(fullFilePath));
			vscode.workspace.applyEdit(workspaceEdit);

		}
	});

	helps.info("Folders structure was succesfully generated!");
}




//* Status: Finished
//! You must have C/C++ Extension!
async function intellisenseActivation() {

	let settings_json = helps.workspaceFolder() + "/.vscode/settings.json";

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
		helps.error("For activation run of2plus: Generate standart folder structure");
		return;
	}




	let settingsPath = helps.workspaceFolder() + "/.vscode/c_cpp_properties.json";


	vscode.commands.executeCommand('C_Cpp.ResetDatabase').then(() => {
		vscode.commands.executeCommand('C_Cpp.ConfigurationEditJSON').then(() => {
			vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {


				let config = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) || {};

				config['configurations'][0]['includePath'].push("~/of2plus-important/**");
				config['configurations'][0]['includePath'].push("/usr/include/**");

				if (!config['configurations'][0]['compilerPath'].includes("g++")) {
					config['configurations'][0]['compilerPath'] = '/usr/local/bin/g++';
				}

				fs.writeFileSync(settingsPath, JSON.stringify(config));
			});


		});
	})
		.then(() => {
			vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});

}




//* Status: Finised
//! Untar not working
//? Added check for same prebuild download
async function of2plusDownloadPrebuilds(context: vscode.ExtensionContext) {

	if (!helps.isConnectedToInternet()) {
		helps.error("You are not connected to the internet! It is impossible to download prebuilds!");
		return;
	}

	//? Get available versions and platforms for

	let versions = await helps.json_from('http://127.0.0.1:5002/versions');
	versions = versions['versions'];


	if (versions?.length === 0) {
		helps.error("No versions available! ");
		return;
	}

	let version = await helps.quickpick(versions, "Choose version of OpenFOAM") || "";



	let platforms = await helps.json_from(`http://127.0.0.1:5002/platforms_for?version=${version}`);
	platforms = platforms['platforms'];

	if (platforms.length === 0) {
		helps.error("No platforms were found for this version!");
		return;
	}

	let platform = await helps.quickpick(platforms, "Choose platform") || "";




	let compressedPrebuildsFile = new Path(extFolder + `/${version}____${platform}.tar.gz`);
	let destination = compressedPrebuildsFile.withSuffix("");


	if (configManager.isInstalled(version, platform)) {
		helps.info("You have already downloaded this prebuild!");
		return;
	}


	if (!helps.prebuildExists(`http://127.0.0.1:5002/exists?version=${version}&platform=${platform}`)) {
		helps.error("Prebuild for such version and platform does not exists!");
		return;
	}

	helps.info("Prebuilds downloading was started...");

	let anyError = false;



	//? Downloading 
	http.get(`http://127.0.0.1:5002/download?version=${version}&platform=${platform}`,
		(res) => {
			const file = fs.createWriteStream(compressedPrebuildsFile.toString());

			res.pipe(file);

			file.on('finish', () => {
				file.close();
				helps.info(`Prebuilds were succesfully downloaded!`);
				targz.decompress({
					src: compressedPrebuildsFile.toString(),
					dest: destination.toString(),
				},
					(err) => {
						if (err) {
							helps.error(err?.toString() || "");
							anyError = true;
						}
						else {
							helps.info("Archive was sucessfully untared!");
						}
					});

				if (!anyError) {
					configManager.install(version, platform, destination, new Path(destination + `/OpenFOAM-v${version}/etc/bashrc`));
				}

			}
			);
		})
		.on("error", (err) => {
			helps.error("Error occured while downloading prebuilds! Check output for more information");
			helps.outputChannel("of2plus stderr").append(err.message);
			anyError = true;
		});

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
		await helps.spawnRedirected(`wmake ${helps.workspaceFolder()}`, helps.outputChannel("wmake build"), helps.outputChannel("wmake build"));
		helps.info("Build finished");
	});


	//? Loads environment
	let loadBashrc = vscode.commands.registerCommand("of2plus.loadbashrc", async () => {
		if (!fs.existsSync(helps.workspaceFolder() + "/.vscode/bashrc")) {
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

		fs.writeFileSync(helps.workspaceFolder() + "/.vscode/bashrc", ". " + configManager.find(version, platform)[0]["bashrc"] + '\nexport LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/usr/local/lib:/usr/lib:/usr/local/lib64:/usr/lib64"\n');
		version_choosed.text = `OpenFOAM: version: ${version} platform: ${platform}`;

	});

	sudo.exec(`echo ". ${helps.workspaceFolder() + "/.vscode/bashrc"}" >> /etc/bashrc`, { name: "Of2plus update bashrc" }, (err) => {
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
