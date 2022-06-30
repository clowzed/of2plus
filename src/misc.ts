/*
This file is a part of of2plus vscode extension
Author: Miasnenko Dmitry (clowzed.work@gmail.com)
GitHub: https://github.com/clowzed/of2plus


Description:
This file contains useful folders for our extension
*/

import Path from 'pathlib-js';
import { ConfigurationManager } from './managers/config-manager';
import { PopupManager } from './managers/popup-manager';
import { ChannelsManager } from './managers/channels-manager';
import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';

export const extension_folder = new Path(process.env.HOME || process.env.USERPROFILE + "/of2plus-important");

if (!extension_folder.existsSync()) {
    extension_folder.makeDirSync();
}

export const global_bashrc = new Path(extension_folder.toString() + '/global_bashrc');

if (global_bashrc.existsSync())
{
    fs.writeFileSync(global_bashrc, "");
}


export let config_filepath = new Path(extension_folder.toString() + "/installed.json");

export let config_manager = new ConfigurationManager(config_filepath.toString());

export let popup_manager = new PopupManager();

export let channels_manger = new ChannelsManager();



export let workspace = () => {
    return vscode.workspace.workspaceFolders?.
        map(folder => folder.uri.path)[0]
        .replace("C:\\", "")
        .replace("/c:", "C:")
        || "./";
};

export let execute = (cmd: string) =>
    new Promise<string>((resolve, reject) => {
        cp.exec(cmd, (err, out) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    });
