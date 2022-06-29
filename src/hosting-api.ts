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
import { extension_folder, popup_manager, config_manager } from './misc';
import { Build } from './managers/config-manager';


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

    download_and_install(version: string, platform: string, identifier: string) {

        let error_ooccured = false;
        
        //? Check if we are connected and prebuild exists
        if (this.check_connection() && this.exists(version, platform)) {

            let final_url = this.url + `/download?version=${version}&platform=${platform}&invitation=${identifier}`

            http.get(final_url,
                (res) => {
                    let ofprebuild_archive = new Path(extension_folder + `/${version}____${platform}.tar.gz`);

                    let destination = ofprebuild_archive.withSuffix("");

                    const file = fs.createWriteStream(ofprebuild_archive.toString());

                    res.pipe(file);

                    file.on('finish', () => {
                        file.close();

                        targz.decompress({
                            src: ofprebuild_archive.toString(),
                            dest: destination.toString(),
                        },
                            (err: { toString: () => any; }) => {
                                if (err) {
                                    popup_manager.error(err?.toString() || "");
                                }
                                else {
                                    popup_manager.information("Archive was sucessfully decompressed!");
                                }
                            });

                        if (!error_ooccured) {
                            config_manager.install({
                                version: version,
                                platform: platform,
                                installation_path: destination,
                                bashrc_path: new Path(destination + `/OpenFOAM-v${version}/etc/bashrc`)
                            });
                        }
                    }
                    );
                })
                .on("error", (err) => {
                    popup_manager.error("Error occured while downloading prebuilds! Check output for more information");
                    error_ooccured = true;
                });
        }
        else {
            error_ooccured = true;
        }
        return error_ooccured;
    }


}