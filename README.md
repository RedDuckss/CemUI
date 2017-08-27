![CemuManager](http://i.imgur.com/xoo1hvx.png)

# ~~NOT UNDER CURRENT DEVELOPMENT~~ IN REWRITE
~~Due to several reasons, development on CemUI has stopped for now. We plan to pick the project up again in the future, but as of now it is not under development. The main reason for this is the host which housed the custom API, along with the database it used, went through recent updates and lost the entire database. I (RedDuckss, main developer) also had a PC roll back, and I lost my backup of the database. The database had over 3k entries, which cannot be easily remade. We have also moved on to other, bigger projects including game development and our overall interest in Cemu itself has dropped a lot. The CemUI discord has been revamped to display these changes.~~ Recently I was able to recover a copy of the lost database. Because of this, I am reviving CemUI and rewriting it from the ground up with 2 new people. See the `2.0` branch.


# CemUI
A small launcher for the Cemu WiiU emulator made with Electron.
You can reach us (the developers) on Discord [here.][1]

CemUI is a small launcher "hub" that stores your Cemu games in a nice easy-to-access fashion.
 
[![Announcing CemUI](https://img.youtube.com/vi/ulQVvROdeVo/0.jpg)](https://www.youtube.com/watch?v=ulQVvROdeVo)
 
**IMPORTANT:** CemUI is still in heavy development and may be unstable. There are many features planned.

## How can I help? / I have a suggestion!
We always welcome suggestions and Pull Requests! This program is written in NodeJS and packaged with Electron. This means that anyone with experience in JavaScript, Node, html, css, and C++ can contribute just fine! With Node, C++ users can contribute as well, due to Node supporting C++ modules, and will be packaged by Electron just fine!

If you have a suggestion, and do not know any of the required languages, you can reach us on our [Discord server][1]

## I found a bug!
Given that this project is still very early in development, bugs will probably be common, and vary from person to person. If you find a bug, we ask that you follow this format for reporting the bug on the `Issue` tracker on the repo:
- A detailed name describing the bug (no "A bug happened" type titles!)
- A detailed description of the bug

- CemUI version
- Exact steps to reproduce
- A screenshot/video of the bug/error message
- List games affected (if applicable)
- If possible, a video or gif showing the exact steps to reproduce (There are many free video recorders out there. It doesn't matter how you record it, as long as it's recorded)
- And above all: stay calm. Currently there are only 2 developers working on this project, and for one this is the first NodeJS app they have worked on. Also given the nature of how Electron packages apps, bugs may not occur on our end but will on yours. Please be patient while we attempt to fix the issue.

Additionally, you can contact us via our [Discord server][1] if you want to speak with us directly.

##### Planned featured include
- Multiple emulator support
- "Big-picture" type mode that can be used with a controller
- ~~All hail the dark theme~~ Added
 
## Installation & Running for public versions
- Download the latest release
- Extract

To run CemUI, simply run `CemUI.exe`
 
## Installation & Running for developer versions
* [Clone the repository](https://help.github.com/articles/cloning-a-repository)
* [Install Node.js & npm](https://docs.npmjs.com/getting-started/installing-node)
* Run `install.bat` or run `npm install` in the CemUI directory.

To run CemUI, simply run `run-dev.bat` or `npm start` in the CemUI directory.

## Building from source
* [Clone the repository](https://help.github.com/articles/cloning-a-repository)
* [Install Node.js & npm](https://docs.npmjs.com/getting-started/installing-node)
* Run `install.bat` or run `npm install` in the CemUI directory.
* Run `build.bat` or run `npm run build` in the CemUI directory. _(The app will be built to `builds/CemuManager-win32-ia32`)_


To run CemUI, simply run `npm start` in the CemUI directory.

# Latest Release

# Version 1.0.1 (**See Disclaimer below**)

## What's new?

[v1.0.1](https://github.com/RedDuckss/CemUI/releases/tag/v1.0.1)

- SMM (Super Mario Maker) Level search/download support added
- Improved alerts and notifications

## Disclaimer!
### The custom API being used by CemUI is _NOT_, I repeat _NOT_ 100% complete. Many pieces of information are missing for most of the games. There is a total of 3,113 games stored in the API, all of which have a TitleID and TitleName attribute. Many do not have data such as overviews, box art, background art, ESRB ratings, etc.

### If you have a game which is missing data, please message us on Discord or create an issue report.
 

## Tasks to complete

- [x] Launch games
- [x] Launch games with other emulators
- [x] SMM Support
- [ ] Full screen mode option
- [x] Change settings option
- [x] Add cemu folder
- [x] Find cemu.exe from folder
- [ ] ~Add external WiiU emulators option~  Scrapped. Will be added to EmuManager
- [x] Add game folder
- [x] Find games within the folder
- [x] Dynamically load new games
- [x] Dynamically remove games
- [ ] ~Load new game (single)~ Scrapped in favor of setting loading
- [ ] ~Remove game (single)~ Scrapped in favor of setting loading

[1]: https://discord.gg/EKn8HnW
