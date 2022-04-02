import * as fs from 'fs';
import * as helps from "./helpers";
import * as https from 'https';
import * as path from 'path';
import * as targz from 'targz';
import * as vscode from 'vscode';

import Path from 'pathlib-js';
import { info } from 'console';
import { report } from 'process';
import { spawn } from 'child_process';

//TODO Reduse magic strings
//TODO Server api with choice of platform (now - only one platform)

const PREBUILDS_SERVER:string = "https://filesamples.com/samples/document/docx/sample4.docx";

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
						 "wmake/Make",
						 ".vscode"];
		
	let fileNames = ["Make/files", "Make/options", ".vscode/settings.json"];
		
		
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
function intellisenseActivation()
{
	
	vscode.commands.executeCommand('of2plus.loadbashrc');
	
	if (process.env.FOAM_INST_DIR === undefined) 
	{
		helps.error("Failed to activate intellisense. Run `of2plus: Activate Extension` or `of2plus: Download prebuilds.`");
		return;
	}
	
	let settingsPath = helps.workspaceFolder() + "/.vscode/settings.json";
	
	
	if (!fs.existsSync(settingsPath.toString()) || fs.readFileSync(settingsPath).length === 0)
	{
		helps.info("Creating settings.json");
		
		fs.writeFileSync(settingsPath, '{}');
		
		helps.info("File was successfully created!");
	}	
	
	let config = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) || {};

	helps.info(JSON.stringify(config));
	
	if (config['C_Cpp.defaul.includePath'] === undefined)
	{
		config['C_Cpp.default.includePath'] = [];
	}

	config['C_Cpp.default.includePath'].push(process.env.FOAM_INST_DIR);
	
	fs.writeFileSync(settingsPath, JSON.stringify(config));
	
}


//* Status: Finised
//! No tests!
// TODO Download libraries and executables
// TODO Extract to of2plus-important
// TODO Generate of2plus_bashrc
function of2plusDownloadPrebuilds(context:vscode.ExtensionContext) 
{
	if (!helps.isConnectedToInternet())
	{
		helps.error("You are not connected to the internet! It is impossible to download prebuilds!");
		return;
	}
	
	let extFolder               = new Path(helps.homeDirectory() + "/of2plus-important");
	let compressedPrebuildsFile = new Path(extFolder + "/of2plus_downloaded_prebuilds.tar.gz");
	let destination             = new Path(extFolder + "/OF");
	
	helps.info("Prebuilds downloading  was started...");

	let anyError = false;
	
	//? Downloading 
	https.get(PREBUILDS_SERVER, (res) => 
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
		targz.decompress(
		{
			src  : compressedPrebuildsFile.toString(),
			dest : destination.toString(),
		}, 
		(err) => 
		{
			if (err) 
			{
				helps.error("Error occured while decompressing prebuilds. Check output for information");
				helps.outputChannel('of2plus stderr').append(err.toString());
			} 
			else 
			{
				helps.info("Prebuilds were succesfully decompressed!");
			}
		});	
	}
};


export function activate(context: vscode.ExtensionContext) 
{
	//? Adding bar buttons
	of2PlusInitializeASourceBarButton(context);
	of2PlusInitializeBuildBarButton(context);

	
	//? Creating home dir for files
	let extFolder = new Path(helps.homeDirectory() + "/of2plus-important");
	if (!extFolder.existsSync()) { extFolder.makeDirSync();}
	
	let bsource = new Path(extFolder + "/of2plus-prebuilds/etc/bashrc");

	
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
	let loadBashrc  = vscode.commands.registerCommand("of2plus.loadbashrc", () => 
	{		
		if (!fs.existsSync(bsource.toString()))
		{
			helps.error("Failed to activate environment! Reason: of2plus_bashrc file does not exists!");
			helps.info("Try running `of2plus download OF prebuilds`");
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
