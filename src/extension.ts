import * as fs from 'fs';
import * as helps from "./helpers";
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import * as targz from 'targz';
import * as vscode from 'vscode';

import Path from 'pathlib-js';
import { report } from 'process';
import { spawn } from 'child_process';
import { stringify } from 'querystring';

const ESTDOUT = "of2plus stdout";
const ESTDERR = "of2plus stderr";

//* Status: Finished
function of2PlusInitializeBuildBarButton(context: vscode.ExtensionContext) 
{
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	
	baritem.command = "of2plus.build";
	baritem.text    = "Build with wmake";
	
	baritem.show();
	context.subscriptions.push(baritem);
}

//* Status: Finished
function of2PlusInitializeASourceBarButton(context: vscode.ExtensionContext) 
{
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	
	baritem.command = "of2plus.loadbashrc";
	baritem.text    = "Activate environment";
	
	baritem.show();
	context.subscriptions.push(baritem);
}

//* Status: Finished
function of2PlusInitializeAIntellisenseBarButton(context: vscode.ExtensionContext) 
{
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	
	baritem.command = "of2plus.activateIntellisense";
	baritem.text    = "Activate Intellisense";
	
	baritem.show();
	context.subscriptions.push(baritem);
}

//* Status: Finished
function of2PlusGenerateStandartFoldersAndFiles()
{

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
		
	let fileNames = ["Make/files", "Make/options", ".vscode/c_cpp_properties.json"];
		
		
	//? This section generates folders
	foldersNames.forEach(folderName => 
	{
		let fullFolderPath = path.join(rootFolder, folderName);
		if (!fs.existsSync(fullFolderPath))
		{
			vscode.workspace.fs.createDirectory(vscode.Uri.file(fullFolderPath));
		}

	});
		
		
	//? This section generates files
	const workspaceEdit = new vscode.WorkspaceEdit();

	fileNames.forEach(fileName => 
	{
		let fullFilePath = path.join(rootFolder, fileName);
			
		if (!fs.existsSync(fullFilePath))
		{
			workspaceEdit.createFile(vscode.Uri.file(fullFilePath));
			vscode.workspace.applyEdit(workspaceEdit);

		}
	});
	
	helps.info("Folders structure was succesfully generated!");
}


//* Status: Finished
//! Not tested
async function intellisenseActivation()
{
	await vscode.commands.executeCommand('of2plus.loadbashrc');
	
	let settingsPath = helps.workspaceFolder() + "/.vscode/c_cpp_properties.json";
	
	await vscode.commands.executeCommand('C_Cpp.ConfigurationEditJSON');
	
	//setTimeout(() => vscode.commands.executeCommand('workbench.action.closeActiveEditor'), 1000);
	
	let config = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) || {};

	config['configurations'][0]['includePath'].push('${HOME}/of2plus-important/**');
	
	fs.writeFileSync(settingsPath, JSON.stringify(config));
	
}


//* Status: Finised
//! No tests!
async function of2plusDownloadPrebuilds(context:vscode.ExtensionContext) 
{
	if (!helps.isConnectedToInternet())
	{
		helps.error("You are not connected to the internet! It is impossible to download prebuilds!");
		return;
	}
	
	
	
	let versions:any = await helps.json_from('http://127.0.0.1:5002/versions');
	versions = versions['versions'];
	
	let platforms:any = await helps.json_from('http://127.0.0.1:5002/platforms');
	platforms = platforms['platforms'];
	
	
	
	let version = await helps.quickpick(versions, "Choose version");
	let platform = await helps.quickpick(platforms, "Choose platform");
	
	
	let extFolder               = new Path(helps.homeDirectory() + "/of2plus-important");
	let compressedPrebuildsFile = new Path(extFolder + `/${version}--()--${platform}.tar.gz`);
	let destination             = compressedPrebuildsFile.withSuffix("");
	
	if (!fs.existsSync(extFolder.toString() + "/installed.json")) {fs.writeFileSync(extFolder.toString() + "/installed.json", "{}");}

	let config_ = JSON.parse(fs.readFileSync(extFolder.toString() + "/installed.json", 'utf8')) || {};
	
	if (config_ !== {} && config_['installed'] !== undefined)
	{	
		if (config_['installed'].filter((inst: {version:string, platform:string}) => inst['platform'] == platform && inst['version'] == version).length !== 0)
		{
			helps.info("You have already downloaded this prebuild!");
			return;
		}
}

	if (!helps.prebuildExists(`http://127.0.0.1:5002/exists?version=${version}&platform=${platform}`))
	{ 
		helps.error("Prebuild of such version and platform does not exists!"); 
		return; 
	}
	
	
	helps.info("Prebuilds downloading was started...");

	let anyError = false;
	
	//? Downloading 
	http.get(`http://127.0.0.1:5002/download?version=${version}&platform=${platform}`, 
	(res) => 
	{
        const file = fs.createWriteStream(compressedPrebuildsFile.toString());

	    res.pipe(file);

	    file.on('finish', () => {
            file.close();
            helps.info(`Prebuilds were succesfully downloaded!`);
        }); 
	})
	.on("error", (err) => 
	{
        helps.error("Error occured while downloading prebuilds! Check output for more information");
        helps.outputChannel("of2plus stderr").append(err.message);
        anyError = true;
	});
	
	//? Extracting file (.tar.gz) if no error occured while downloading
	if (!anyError)
	{
		helps.spawnRedirected(`cd ${extFolder.toString()} && tar -xf ${compressedPrebuildsFile.toString()}`,
				helps.outputChannel("of2plus stderr"), helps.outputChannel("of2plus stdout"));
	}
	

	let config = JSON.parse(fs.readFileSync(extFolder.toString() + "/installed.json", 'utf8')) || {};
	
	if (config['installed'] === undefined)
	{
		config['installed'] = [];
	}
	
	config['installed'].push({'version': version, 'platform': platform, 'path' : destination.toString(), 'bashrc' : destination + `/OpenFOAM-v${version}/etc/bashrc`});
	
	fs.writeFileSync(extFolder.toString() + "/installed.json", JSON.stringify(config));

	

};


export function activate(context: vscode.ExtensionContext) 
{
	//? Adding bar buttons
	of2PlusInitializeASourceBarButton(context);
	of2PlusInitializeBuildBarButton(context);
	of2PlusInitializeAIntellisenseBarButton(context);

	
	//? Creating home dir for files
	let extFolder = new Path(helps.homeDirectory() + "/of2plus-important");
	if (!extFolder.existsSync()) { extFolder.makeDirSync();}
	

	
	//? Simple activation command
	let activation = vscode.commands.registerCommand('of2plus.activate', () => 
	{
		helps.info("Of2plus extension is activated!");
	});
	
	
	//? This builds with wmake
	//? Before start loads enironment
	let disposable = vscode.commands.registerCommand('of2plus.build', () => 
	{
		vscode.commands.executeCommand('of2plus.loadbashrc');
		helps.spawnRedirected("wmake", helps.outputChannel("wmake build"), helps.outputChannel("wmake build"));
	});
	

	//? Loads environment
	//* Status: Working
	//! Using . command so it is not accessable through windows
	let loadBashrc  = vscode.commands.registerCommand("of2plus.loadbashrc", async () => 
	{		
		let config = JSON.parse(fs.readFileSync(extFolder.toString() + "/installed.json", 'utf8')) || {};
		
		if (config === {}) 
		{
			helps.error("Failed to activate environment!");
			helps.info("Try running `of2plus: Download openfoam prebuilds.`");
		}

		let versions = config['installed'].map((installation:{version:string})   => installation['version']);
		let platforms = config['installed'].map((installation:{platform:string}) => installation['platform']);
		
		
		let version = await helps.quickpick(versions, "Choose version");
		let platform = await helps.quickpick(platforms, "Choose platform");
		
		if (config['installed'].filter((inst:{version:string, platform: string}) => inst['version'] === version && inst['platform'] === platform).length === 0)
		{
			helps.info("Such installation was not found");
			return;
		}
		
		
		
		let bsource = config['installed'].filter((inst:{version:string, platform: string}) => inst['version'] === version && inst['platform'] === platform)[0]['bashrc'];
		helps.info(bsource.toString());
		if (!fs.existsSync(bsource.toString()))
		{
			helps.error("Failed to activate environment!");
			helps.info("Bashrc file was not found");
		}
		else
		{
			let process = spawn(".", [bsource.toString()], {shell: true});
			
			process.stdout.on('data', (data) => {helps.outputChannel("of2plus stdout").append(data.toString());});
			process.stderr.on('data', (data) => {helps.outputChannel("of2plus stderr").append(data.toString());});
			

			process.on('exit', (code) => 
			{
				switch (code)
				{
					case undefined:
						helps.warn("Something went wront while activating environment. Check that you are working on linux");
						break;
					case 0:
						helps.info("Envoronment was succesfully activated!");
						break;
					default:
						helps.error("Something Something went wront while activating environment.");	
						break;
				};
			});	
		}
	});
	
	
	
	let foldersInit  = vscode.commands.registerCommand("of2plus.genfolders", of2PlusGenerateStandartFoldersAndFiles);
	let foamLoad     = vscode.commands.registerCommand("of2plus.downloadOF", of2plusDownloadPrebuilds);
	let intellisense = vscode.commands.registerCommand("of2plus.activateIntellisense", intellisenseActivation);
		
	
	context.subscriptions.push(disposable);
	context.subscriptions.push(foldersInit);
	context.subscriptions.push(activation);
	context.subscriptions.push(foamLoad);
	context.subscriptions.push(loadBashrc);
	context.subscriptions.push(intellisense);
}



export function deactivate() 
{
	helps.info("of2plus extension is deactivated!");
}
