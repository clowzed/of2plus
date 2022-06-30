/*
This file is a part of of2plus vscode extension
Author: Miasnenko Dmitry (clowzed.work@gmail.com)
GitHub: https://github.com/clowzed/of2plus


Description:
This file contains class ConfigurationManager which
helps to handle config.json file with necessary data

For now it keeps installed openfoam builds and their paths
*/

import * as fs from 'fs';
import Path from 'pathlib-js';
import { config_filepath } from '../misc';


export type Build = {
    version: string,
    platform: string,
    installation_path: string,
    bashrc_path: string,
};

export type Config = {
    installed_builds: Build[],
    choosed_version: String,
    choosed_platform: String,
};



export class ConfigurationManager {
    private filepath: Path;
    private config: Config;

    constructor(filepath: Path) {
        this.filepath = filepath;
        this.load();
    }

    //* This function loads config from path
    load() {
        if (!fs.existsSync(this.filepath)) {
            this.save()
        }
        this.config = JSON.parse(fs.readFileSync(this.filepath.toString(), 'utf-8'));
    }

    //* THis function writes json
    //* with current config to file
    save() {
        fs.writeFileSync(this.filepath.toString(), JSON.stringify(this.config))
    }

    //* This function returns an array
    //* of installed builds
    builds() {
        return this.config.installed_builds;
    }

    //* This function returns a string array
    //* of installed versions
    versions() {
        return this.builds().map((build) => build.version);
    }

    //* This function returns a string array
    //* of installed platforms
    platforms() {
        return this.builds().map((build) => build.platform)
    }

    //* This function checks if build with
    //* given params is installed
    installed(version: string, platform: string) {
        return this.get(version, platform) != undefined;
    }

    //* This function returns build
    //* with given params if this
    //* build exists. 
    //! If the build does not exist
    //! function returns 'undefined'
    get(version: String, platform: String) {
        if (!this.installed(version, platform)) {
            return undefined;
        }
        else {
            return this.builds().filter((build) => build.version === version && build.platform === platform)[0];
        }
    }

    //* This fucntion adds build to current 
    //* config and saves it
    install(build: Build) {
        this.config.installed_builds.push(build);
        this.save();
    }

    choosed_version() {
        return this.config.choosed_version || "";
    }

    choosed_platform() {
        return this.config.choosed_platform || "";
    }

    set_version(version: String) {
        this.config.choosed_version = version;
        this.save()
    }

    set_platform(platform: String)
    {
        this.config.choosed_platform = platform;
        this.save()
    }

    current_build()
    {
        return this.get(this.choosed_version(), this.choosed_platform());
    }
}
