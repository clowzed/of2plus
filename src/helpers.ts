import * as dns from 'dns';
import * as vscode from 'vscode';

import fetch from 'node-fetch';
import * as fs from 'fs';
import Path from 'pathlib-js';

let outputChannels: Map<string, vscode.OutputChannel> = new Map();

import * as cp from "child_process";
import { getHeapSnapshot } from 'v8';

const execShell = (cmd: string) =>
	new Promise<string>((resolve, reject) => {
		cp.exec(cmd, (err, out) => {
			if (err) {
				return reject(err);
			}
			return resolve(out);
		});
	});


export function isConnectedToInternet() {
	let result = true;
	dns.resolve("ww.google.com", (err: any) => { result = false; });
	return result;
}

export async function spawnRedirected(command: string, stderr: vscode.OutputChannel, stdout: vscode.OutputChannel) {
	let childProcess = await execShell(command);
	stdout.append(childProcess);
	return childProcess;
}


export function outputChannel(name: string) {
	let lookup = outputChannels.get(name);

	if (lookup === undefined) {
		let newChannel = vscode.window.createOutputChannel(name);
		outputChannels.set(name, newChannel);
		return newChannel;
	}
	return lookup;
};


export function workspaceFolder() {
	return vscode.
		workspace.
		workspaceFolders?.
		map(folder => folder.uri.path)[0]
		.replace("C:\\", "")
		.replace("/c:", "C:")
		|| "./";
}

//? Shortcut for showing info message
export function info(msg: string) {
	vscode.window.showInformationMessage(msg);
}

//? Shortcut for showing warn message
export function warn(msg: string) {
	vscode.window.showWarningMessage(msg);
}

//? Shortcut for showing error message
export function error(msg: string) {
	vscode.window.showErrorMessage(msg);
}

export function homeDirectory() {
	return process.env.HOME || process.env.USERPROFILE;
}

export async function json_from(url: string) {
	return await fetch(url).then((res: { json: () => any; }) => res.json());
}

export async function quickpick(lables: [string], title: string) {
	return await vscode.window.showQuickPick(lables, { title: title });
}

export async function prebuildExists(url: string) {
	return (await fetch(url).then((res: { json: () => any; }) => res.json()))['exists'] === 'true';
}

export function reqursiveRead(directory: string) {
	let files: string[] = [];
	fs.readdirSync(directory).forEach((file) => {
		let file_ = new Path(directory + '/' + file);
		switch (fs.lstatSync(file_.toString()).isDirectory()) {
			case true:
				let inner_files: string[] = reqursiveRead(file_.toString());
				files.push(...inner_files);
				break;

			case false:
				files.push(file_.toString());
				break;

		}
	});
	return files;

}