import * as fs from 'fs';
import * as path from 'path';

import Path from 'pathlib-js';
import { threadId } from 'worker_threads';

export class Manager
{
    private data:any;
    private filename:Path;
    
    constructor (filename:Path)
    {
        this.filename = filename;
        this.data = {};
        if (!fs.existsSync(filename.toString()))
        {
            this.save();
        }
        this.load()
        
    }
    
    isInstalled(version:string, platform:string)
    {
        return this.find(version, platform).length !== 0; 
    }
    
    install(version:string, platform:string, path:Path, bashrc:Path)
    {
        if (!this.isInstalled(version, platform))
        {
            if (this.data["installed"] === undefined) 
            {
                this.data["installed"] = []; 
            }
            
            this.data["installed"].push(
            {
                version  : version,
                platform : platform,
                path     : path.toString(),
                bashrc   : path.toString(),
            }
            );
        }
        this.save();
    }
    
    find(version:string, platform:string)
    {
        if (this.data["installed"] === undefined) 
        {
            this.data["installed"] = []; 
            return [];
        }
        
        return this.data["installed"]
                   .filter(( build: {version: string, platform: string} )=> 
                                build["version"] === version &&
                                build["platform"] === platform);
    }
    
    save()
    {
        fs.writeFileSync(this.filename.toString(), JSON.stringify(this.data));
    }
    
    load()
    {
        this.data = JSON.parse(fs.readFileSync(this.filename.toString(), 'utf-8'));
    }
    
    
    
    
}