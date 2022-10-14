/* eslint-disable @typescript-eslint/naming-convention */
/*
This file is a part of of2plus vscode extension
Author: Miasnenko Dmitry (clowzed.work@gmail.com)
GitHub: https://github.com/clowzed/of2plus


Description:
This file contains useful folders and managers for our extension
*/

import Path from 'pathlib-js';
import { ConfigurationManager } from './managers/config-manager';
import { PopupManager } from './managers/popup-manager';
import { ChannelsManager } from './managers/channels-manager';
import * as vscode from 'vscode';
import * as cp from "child_process";


export const extension_folder = new Path((process.env.HOME || process.env.USERPROFILE) + "/of2plus-important");

if (!extension_folder.existsSync()) {
    extension_folder.makeDirSync();
}

export let config_filepath = new Path(extension_folder.toString() + "/installed.json");

export let config_manager = new ConfigurationManager(config_filepath);

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



export let information = (text: string) => {
    popup_manager.information(text);
    channels_manger.cinformation('of2plus', text);
};

/**
 * It displays a warning message.
 * @param {string} text - The text to display in the popup and in the console
 */
export let warning = (text: string) => {
    popup_manager.warning(text);
    channels_manger.cwarning('of2plus', text);
};

/**
 * It displays an error message in the popup and in the console
 * @param {string} text - The text to display in the popup.
 */
export let error = (text: string) => {
    popup_manager.error(text);
    channels_manger.cerror('of2plus', text);
};

