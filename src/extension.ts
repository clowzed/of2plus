// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';


function add_bar_build_button() 
{
	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	baritem.command = "of2plus.build";
	baritem.text = "Build with wmake";
	baritem.show();
	return baritem;
}

function spawn_redirected(command:string, stderr:vscode.OutputChannel, stdout:vscode.OutputChannel) 
{
	info_message(command)
	let child_process = spawn(command);
	child_process.stderr.on("data", (data) => stderr.append(data.toString()));
	child_process.stdout.on("data", (data) => stdout.append(data.toString()));
	return child_process;
}

function add_output_channel(name: string) 
{
	return vscode.window.createOutputChannel(name);
}

function get_root_folder() 
{
	return vscode.workspace.workspaceFolders?.map(folder => folder.uri.path)[0];
}

function info_message(msg: string) 
{
	vscode.window.showInformationMessage(msg);
}

export function activate(context: vscode.ExtensionContext) {

	let baritem = add_bar_build_button();
	context.subscriptions.push(baritem);

	const wmake_output = add_output_channel("Wmake build output");
	const of2plus_stderr = add_output_channel(`of2plus stderr`);
	const of2plus_stdout = add_output_channel(`of2plus stdout`);

	let root_folder = get_root_folder() || "./";
	
	// This is for windows testing
	root_folder = path.resolve(root_folder).replace("C:\\", "");
	
	let activation = vscode.commands.registerCommand('of2plus.activate', () => 
	{
		info_message("Of2plus extension is activated!");
	});
	
	let disposable = vscode.commands.registerCommand('of2plus.build', () => 
	{
		info_message("Starting build with wmake...");

		const build_proccess = spawn_redirected('cd "' + root_folder + '"' + " && wmake", wmake_output, wmake_output);
		
	});
	

	let folders_init = vscode.commands.registerCommand("of2plus.genfolders", () => 
	{
		let folders_names = ["applications", "bin", 
							 "doc", "etc", 
							 "lib", "src", 
							 "tutorials", "wmake", 
							 "applications/bin", 
							 "applications/solvers",
							 "applications/test",
							 "applications/utilities",
							 "doc/Doxygen",
							 "wmake/Make"];
		
		let file_names = ["wmake/Make/files", "wmake/Make/options"];
		
		folders_names.forEach(folder_name => 
		{
			let folder_path = path.join(root_folder, folder_name);

			if (!fs.existsSync(folder_path))
			{
				vscode.workspace.fs.createDirectory(vscode.Uri.file(folder_path));
			}
			else
			{
				info_message("Folder with name " + folder_name + " already exists!");
			}
		});
		
		const workspaceEdit = new vscode.WorkspaceEdit();

		file_names.forEach(file_name => 
		{
			let file_path = path.join(root_folder, file_name);
			
			if (!fs.existsSync(file_path))
			{
				workspaceEdit.createFile(vscode.Uri.file(file_path));
				vscode.workspace.applyEdit(workspaceEdit);

			}
		});
		
		
	
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(folders_init);
	context.subscriptions.push(activation);
}

export function deactivate() 
{
	info_message("of2plus extension is deactivated!");
}
