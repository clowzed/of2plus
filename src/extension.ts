// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "of2plus" is now active!');

	let baritem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	baritem.command = "of2plus.build";
	baritem.text = "Build with wmake";
	baritem.show();

	context.subscriptions.push(baritem);

	const outputChannel = vscode.window.createOutputChannel(`Wmake build output`);
	const of2plus_stderr = vscode.window.createOutputChannel(`of2plus stderr`);
	const of2plus_stdout = vscode.window.createOutputChannel(`of2plus stdout`);
	const folders = vscode.workspace?.workspaceFolders;
	let root_dir = "./";
	if (folders?.length)
	{
		root_dir = folders[0].uri.path.toString().replace("C:", "");
	}


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('of2plus.build', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user


		const build_proccess = spawn("g++");

		build_proccess.stderr.on("data", (data) => outputChannel.append(data.toString()));

		vscode.window.showInformationMessage('Hello World from of2plus-devkit!');
	});

	let folders_init = vscode.commands.registerCommand("of2plus.genfolders", () => {
		let folders_names = ["applications", "bin", "doc", "etc", "lib", "src", "tutorials", "wmake"];
		folders_names.map(folder_name => fs.mkdir(root_dir.toString() + "/" + folder_name.toString(), (err) => { of2plus_stderr.append(err?.message || ""); }));

	})

	context.subscriptions.push(disposable);
	context.subscriptions.push(folders_init);
}

// this method is called when your extension is deactivated
export function deactivate() { }
