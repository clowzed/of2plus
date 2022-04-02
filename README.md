# Of2plus-devkit


## Prerequrites
- openfoam
- wmake

#### Arch installtion
Install `aurman` first and then
```bash
aurman -S openfoam-org
```

### Ubuntu installation
```bash
sudo sh -c "wget -O - https://dl.openfoam.org/gpg.key | apt-key add -"
sudo add-apt-repository http://dl.openfoam.org/ubuntu
sudo apt-get update
sudo apt-get -y install openfoam9

```
### Dev run

1. Open this folder
2. run `npm install`
3. run `npm run compile`
4. Press `F5` this will open new window.
5. `Ctrl` + `Shift` + `P` and type `Activate of2plus`
6. Now explore commands with typing `of2plus`
### Commands
Press `Ctrl` + `Shift` + `P` and type `of2plus`
- It can generate nesesarry folders for the project
- In status bar you can find `Build with Wmake` which will build your project
- Open terminal ang go to `OUTPUT`. There you will find `of2plus stderr` for errors and `of2plus stdout` for other messages.


## Roadmap
- [ ✔️] - Folders generation
- [ ✔️] - Ui uttons and output redirecting
- [ 🔴] - Add Intellicense for openfoam headers
- [ 🔴] - Add Fields printing in debug mode