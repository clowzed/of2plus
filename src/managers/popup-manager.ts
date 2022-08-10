/*
This file is a part of of2plus vscode extension
Author: Miasnenko Dmitry (clowzed.work@gmail.com)
GitHub: https://github.com/clowzed/of2plus


Description:
This file contains class PopupManager which
shows popup messages to user and asks for useful information
*/

import * as vscode from 'vscode';


export class PopupManager {
    constructor() { }

    //* Shows information message to user
    information(text: string) {
        vscode.window.showInformationMessage(text);
    }

    //* Shows warning message to user
    warning(text: string) {
        vscode.window.showWarningMessage(text);
    }

    //* Shows error message to user
    error(text: string) {
        vscode.window.showErrorMessage(text);
    }

    //* Asks user to choose one item
    //* From given and returns it
    async quickpick(lables: [string], title: string) {
        return await vscode.window.showQuickPick(lables, { title: title });
    }

    //* This functions asks user to type something
    //* It returns string containig user input
    //! No check for user to close dialog
    //! Check if string is empty before using it
    async ask(placeholder: string, prompt: string, value: string) {
        return await vscode.window.showInputBox(
            {
                placeHolder: placeholder,
                prompt: prompt,
                value: value,
            }
        );
    }
}
