/*
This file is a part of of2plus vscode extension
Author: Miasnenko Dmitry (clowzed.work@gmail.com)
GitHub: https://github.com/clowzed/of2plus


Description:
This file contains class OFPrebuildsHostingApi which
allows us to interract with any hosting api with prebuilds

Look for hosting api in https://github.com/clowzed/ofprebuilds-hosting
*/

import * as dns from 'dns';
import fetch from 'node-fetch';
import * as http from 'http';
import * as fs from 'fs';
import * as targz from 'targz';
import Path from 'pathlib-js';
import { extension_folder, popup_manager, config_manager, channels_manger, information, error } from './misc';


export class OFPrebuildsHostingApi {
    private identifier: string;
    private url: string;

    constructor(url: string, identifier: string | undefined) {
        this.identifier = identifier || "";
        this.url = url;
    }

    check_connection() {
        let result = true;
        dns.resolve("ww.google.com", (err: any) => { result = false; });
        return result;
    }

    async fetchjson(url: string) {
        return await fetch(url).then((res: { json: () => any; }) => res.json());
    }

    async versions() {
        let final_url = this.url + '/versions';
        return await this.fetchjson(final_url);
    }

    async platforms() {
        let final_url = this.url + '/platforms';
        return await this.fetchjson(final_url);
    }

    async versions_for(platform: string) {
        let final_url = this.url + `/versions_for?platform=${platform}`;
        return await this.fetchjson(final_url);
    }

    async platforms_for(version: string) {
        let final_url = this.url + `/platforms_for?version=${version}`;
        return await this.fetchjson(final_url);
    }

    async exists(version: string, platform: string) {
        let final_url = this.url + `/exists?version=${version}&platform=${platform}`;
        let answer = await this.fetchjson(final_url);
        return answer['exists'] === 'true';
    }

    async download_and_install(version: string, platform: string, identifier: string) {

        let error_ooccured = false;

        channels_manger.cinformation('of2plus', "Checking internet connection and prebuild existance...");

        //? Check if we are connected and prebuild exists
        if (this.check_connection() && await this.exists(version, platform))
        {

            let final_url = this.url + `/download?version=${version}&platform=${platform}&invitation=${identifier}`

            channels_manger.cinformation('of2plus', "Asking server...");

            http.get(final_url,
                (res) => {
                    channels_manger.cinformation('of2plus', `Server responded with : ${res.statusCode}`);

                    let ofprebuild_archive = new Path(extension_folder + `/${version}____${platform}.tar.gz`);

                    channels_manger.cinformation('of2plus', `Archive path: ${ofprebuild_archive.toString()}`);

                    let destination = ofprebuild_archive.withSuffix("");

                    channels_manger.cinformation('of2plus', `Destination: ${destination.toString()}`)

                    const file = fs.createWriteStream(ofprebuild_archive.toString());

                    channels_manger.cinformation("of2plus", "Writing data to archive....");
                    res.pipe(file);

                    file.on('finish', () => {
                        file.close();

                        information("Archive was downloaded! Please do not close until it wil be decompressed! It can take several minutes");

                        targz.decompress({
                            src: ofprebuild_archive.toString(),
                            dest: destination.toString(),
                        },
                            (err) => {
                                if (err) {
                                    error_ooccured = true;
                                    error(`Error occured while decompressing: ${err.toString()}`)
                                }
                                else {
                                    information("Archive was sucessfully decompressed!");
                                }
                            });

                        if (!error_ooccured) {
                            config_manager.install({
                                version: version,
                                platform: platform,
                                installation_path: destination.toString(),
                                bashrc_path: (new Path(destination + `/OpenFOAM-v${version}/etc/bashrc`)).toString()
                            });
                        }
                    }
                    );
                })
                .on("error", (err) => {
                    error("Error occured while downloading prebuilds! Check output for more information");
                    channels_manger.cerror("of2plus", err.message);
                    error_ooccured = true;
                });
        }
        else {
            channels_manger.cerror('of2plus', "You are not connected to the internet or this build does not exists!");
            error_ooccured = true;
        }

        return error_ooccured;
    }


}