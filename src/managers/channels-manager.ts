/* eslint-disable @typescript-eslint/naming-convention */
/*
This file is a part of of2plus vscode extension
Author: Miasnenko Dmitry (clowzed.work@gmail.com)
GitHub: https://github.com/clowzed/of2plus


Description:
This file contains class ChannelsManager which
helps to send messages to output channels

*/

import * as vscode from 'vscode';

export class ChannelsManager {
    private channels: Map<string, vscode.OutputChannel>;

    constructor() {
        this.channels = new Map();
    }

    //* this function lookup channel in hasmap
    //* if nothing was found new channel will
    //* be created and returned;
    get_channel(channel_name: string) {
        let channel = this.channels.get(channel_name);
        if (channel === undefined) {
            channel = vscode.window.createOutputChannel(channel_name);
            this.channels.set(channel_name, channel);
        }
        return channel;
    }

    //* Sends text message with 
    //* info prestring into channel
    cinformation(channel_name: string, text: string) {
        let channel = this.get_channel(channel_name);
        channel.append(`of2plus info  : ${text}`);
    }

    //* Sends text message with 
    //* error prestring into channel
    cerror(channel_name: string, text: string) {
        let channel = this.get_channel(channel_name);
        channel.append(`of2plus error : ${text}`);
    }

    //* Sends text message with 
    //* warning prestring into channel
    cwarning(channel_name: string, text: string) {
        let channel = this.get_channel(channel_name);
        channel.append(`of2plus warn  : ${text}`);
    }
}

