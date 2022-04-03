//? This class provides microAPI for prebuilds hosting
//? It is not used now. Consider adding it when server will be provided
//! Status: Finished but not tested

import * as fs from 'fs';
import * as https from 'https';

import fetch from 'node-fetch';

class VersionsJsonAnswer
{
    versions:string[] | undefined;
}

class PlatformsJsonAnswer
{
    platforms:string[] | undefined;
}

export class PrebuildsHostingAPI
{
    private hostingServerUrl:string;
    
    constructor(hostingServerUrl:string)
    {    
        this.hostingServerUrl = hostingServerUrl;
    }
    
    async getVersions()
    {   

        let settings = { method: "Get" };

        let resp = await fetch(this.hostingServerUrl, settings);
        if (resp.ok)
        {
            let result = await resp.json();
            let versions = new VersionsJsonAnswer();
            let answer = Object.assign(versions, result);
            return answer.versions || [];
        }
        return [];

    }
    
    async getPlatform()
    {   

        let settings = { method: "Get" };

        let resp = await fetch(this.hostingServerUrl, settings);
        if (resp.ok)
        {
            let result = await resp.json();
            let platforms = new PlatformsJsonAnswer();
            let answer = Object.assign(platforms, result);
            return answer.platforms || [];
        }
        return [];
    }
    
    download(version:string, platform:string, filepath:string)
    {
        let ok = true;
        const url = this.hostingServerUrl + `/${version}/${platform}`;
        
        https.get(url, (res) => 
	    {
        const file = fs.createWriteStream(filepath);
	    res.pipe(file);

	    file.on('finish', () => {
            file.close();
        }); 
	})
	.on("error", (err) => 
	{
	    ok = false;
	});
        return ok;
    }
};