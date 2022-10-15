/* eslint-disable @typescript-eslint/naming-convention */
/*
This file is a part of of2plus vscode extension
Author: Miasnenko Dmitry (clowzed.work@gmail.com)
GitHub: https://github.com/clowzed/of2plus


Description:
This file contains class ConfigurationManager which
helps to handle config.json file with necessary data

For now it keeps installed openfoam builds and their paths
*/
/**
 * `Build` is an object with four properties, `version`, `platform`, `installation_path`, and
 * `bashrc_path`, all of which are strings.
 * 
 * The `Build` type is used in the `builds` array, which is defined as follows:
 * @property {string} version - The version of the build.
 * @property {string} platform - The platform that the build is for.
 * @property {string} installation_path - The path to the installation directory.
 * @property {string} bashrc_path - The path to the bashrc file
 */
export type Build = {
    version: string,
    platform: string,
    installation_path: string,
    bashrc_path: string,
};

/**
 * `Config` is an object with three properties: `installed_builds`, `choosed_version` and
 * `choosed_platform`.
 * 
 * The `installed_builds` property is an array of `Build` objects.
 * 
 * The `choosed_version` property is a string.
 * 
 * The `choosed_platform` property is a string.
 * @property {Build[]} installed_builds - An array of Build objects.
 * @property {string} choosed_version - Choosed OF version.
 * @property {string} choosed_platform - Choosed OF platform.
 */
export type Config = {
    installed_builds: Build[],
    choosed_version: string,
    choosed_platform: string,
};



import * as fs from 'fs';
import path = require('path');
import Path from 'pathlib-js';



/* It's a class that manages OpenFOAM configuration */
export class ConfigurationManager {
    private filepath: Path;
    private config: Config;

    constructor(filepath: Path) {
        this.filepath = filepath;
        this.config = { "choosed_platform": "", "choosed_version": "", "installed_builds": [] };
        this.load();
    }

    /**
     * If the file doesn't exist, find all the existing builds and install them
     */
    load() {
        if (!fs.existsSync(this.filepath.toString())) {

            let builds = this.find_existing_of_builds();

            for (const build of builds) {
                if (!(this.versions().find((version) => version === build.version) === undefined))
                    this.install(build);
            }

            this.save();
        }
        this.config = JSON.parse(fs.readFileSync(this.filepath.toString(), 'utf-8'));
    }


    /**
     * It saves the config file
     */
    save() {
        fs.writeFileSync(this.filepath.toString(), JSON.stringify(this.config));
    }


    /**
     * > It returns the value of the `installed_builds` property of the `config` object
     * @returns The installed_builds property of the config object.
     */
    builds() {
        return this.config.installed_builds;
    }


    /**
     * It returns an array of all the versions of TypeScript that are available for download
     * @returns An array of the versions of the builds.
     */
    versions() {
        return this.builds().map((build) => build.version);
    }


    /**
     * It returns an array of all the platforms that are installed
     * @returns An array of strings.
     */
    platforms() {
        return this.builds().map((build) => build.platform);
    }


    /**
     * It returns true if the version and platform are already installed
     * @param {string} version - The version of build you want to check
     * @param {string} platform - The platform of build you want to check,
     * @returns bool
     */
    installed(version: string, platform: string) {
        return this.get(version, platform) !== undefined;
    }

    /**
     * It returns the first build that matches the given version and platform
     * @param {string} version - The version of the build you want to get.
     * @param {string} platform - The platform of the build you want to get.
     * @returns The first build that matches the version and platform.
     */
    get(version: string, platform: string) {
        return this.builds().filter((build) => build.version === version && build.platform === platform)[0];
    }

    /**
     * It adds a build to the list of installed builds
     * @param {Build} build - The build object that you want to install.
     */
    install(build: Build) {
        this.config.installed_builds.push(build);
        this.save();
    }

    /**
     * It returns the value of the property choosed_version of the object config.
     * @returns The choosed_version property of the config object.
     */
    choosed_version() {
        return this.config.choosed_version || "";
    }

    /**
     * It returns the value of the `choosed_platform` property of the `config` object, or an empty
     * string if the property doesn't exist
     * @returns The value of the property choosed_platform of the object config.
     */
    choosed_platform() {
        return this.config.choosed_platform || "";
    }

    /**
     * It sets the version of the config object to the version passed in as a parameter
     * @param {string} version - The version you want to set.
     */
    set_version(version: string) {
        this.config.choosed_version = version;
        this.save();
    }

    /**
     * It sets the platform to the one that was passed in
     * @param {string} platform - The platform you want to set.
     */
    set_platform(platform: string) {
        this.config.choosed_platform = platform;
        this.save();
    }

    /**
     * It returns the build that is currently selected in the dropdown menu
     * @returns The current build.
     */
    current_build() {
        return this.get(this.choosed_version(), this.choosed_platform());
    }

    find_existing_of_builds() {
        let found = [];

        let openfoam_installation_folder_pattern = "";
        let of_re = new RegExp(openfoam_installation_folder_pattern);

        let std_of_installation_folder = "~/OpenFOAM";

        if (!fs.existsSync(std_of_installation_folder)) {
            return [];
        }

        let folders = fs.readdirSync(std_of_installation_folder).filter((path) => fs.lstatSync(path).isDirectory());
        let of_installation_folders = folders.filter((folder) => path.dirname(folder).match(of_re));

        for (let installation_folder of of_installation_folders) {
            let version = path.dirname(installation_folder).split("-")[1];
            found.push({
                version: version,
                platform: "",
                installation_path: installation_folder,
                bashrc_path: path.join(installation_folder, "/etc/bashrc"),
            })
        }
        return found;
    }
}
