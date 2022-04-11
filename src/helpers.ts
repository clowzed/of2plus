import * as dns     from 'dns';
import * as http from 'http';
import * as vscode  from 'vscode';

import fetch from 'node-fetch';
import { spawn }    from 'child_process';

let outputChannels: Map<string, vscode.OutputChannel> = new Map();


export function isConnectedToInternet()
{
	let result = true;
	dns.resolve("ww.google.com", (err:any) => {result = false;});
	return result;
}

export function spawnRedirected(command:string, stderr:vscode.OutputChannel, stdout:vscode.OutputChannel) 
{
	let childProcess = spawn(command);
	
	childProcess.stderr.on("data", (data) => stderr.append(data.toString()));
	childProcess.stdout.on("data", (data) => stdout.append(data.toString()));
	
	return childProcess;
}


export function outputChannel (name: string)
{
    let lookup = outputChannels.get(name);
    
    if (lookup === undefined)
    {
        let newChannel = vscode.window.createOutputChannel(name);
        outputChannels.set(name, newChannel);
        return newChannel;
    }
	return lookup;
};


export function workspaceFolder() 
{
	return vscode.
		   workspace.
		   workspaceFolders?.
		   map(folder => folder.uri.path)[0]
		   .replace("C:\\", "")
		   .replace("/c:", "C:")
		   || "./";
}

//? Shortcut for showing info message
export function info(msg: string) 
{
	vscode.window.showInformationMessage(msg);
}

//? Shortcut for showing warn message
export function warn(msg: string) 
{
	vscode.window.showWarningMessage(msg);
}

//? Shortcut for showing error message
export function error(msg: string) 
{
	vscode.window.showErrorMessage(msg);
}

export function homeDirectory()
{
	return process.env.HOME || process.env.USERPROFILE;
}

export async function json_from(url:string)
{   
	return await fetch(url).then((res: { json: () => any; }) => res.json());
}

export async function quickpick(lables:[string])
{
	return await vscode.window.showQuickPick(lables);
}

export async function prebuildExists(url:string)
{
	return (await fetch(url).then((res: { json: () => any; }) => res.json()))['exists'] === 'true';
}