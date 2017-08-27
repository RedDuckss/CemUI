'use strict';

//////////////////////////////////////////////////////////////////
///                                                            ///
///                        Dependencies                        ///
///                                                            ///
//////////////////////////////////////////////////////////////////

var electron      = require('electron'),
	fs            = require('fs-extra'),
	originalFs    = require('original-fs'),
	exec          = require('child_process').exec,
	dns           = require('dns'),
	path          = require('path'),
	url           = require('url'),
	XMLParser     = require('pixl-xml'),
	async         = require('async'),
	moment        = require('moment'),
	unzipper      = require('unzipper'),
	zipFolder     = require('zip-folder'),
	_7zip         = require("7zip-standalone"),
	request       = require('request').defaults({ encoding: null }),
	Entities      = require('html-entities').AllHtmlEntities,
	smm_api       = require('smm-api'),
	winston       = require('winston'),
	entities      = new Entities(),
	dialog        = electron.dialog,
	BrowserWindow = electron.BrowserWindow,
	ipcMain       = electron.ipcMain,
	app           = electron.app;

winston.emitErrs = true;

var logger = new (winston.Logger)({
	level: 'verbose',
    transports: [
      	new winston.transports.Console({ colorize: true }),
      	new (winston.transports.File)({
      		colorize: false,
      		json: false,
      		filename: 'cemui.error.log'
      	})
    ]
});

const APP_VERSION = '1.1.1';


var user_settings = {
	is_dark: false,
	display_mode: 'box'
}

app.setName("CemUI");

let ApplicationWindow; // Main application window

function createWindow(file) { // Creates window from file
  	ApplicationWindow = new BrowserWindow({
  		icon: './ico.png',
  		titleBarStyle: 'hidden', // Borderless
  		frame: false             // Borderless
  	});
  	ApplicationWindow.loadURL(url.format({ // Makes the window
  		pathname: path.join(__dirname, '/app/'+file+'.html'),
  		//pathname: path.join(__dirname, '/app/test.html'),
    	protocol: 'file:',
    	slashes: true
  	}));
  	//ApplicationWindow.webContents.openDevTools()
  	ApplicationWindow.on('closed', () => {
    	ApplicationWindow = null; // Clear the variable when the window closes
  	});
}



app.on('ready', function() {
	generalLoad(); // Load things when the app is ready
	ApplicationWindow.webContents.on('new-window', function(e, url) {
  		e.preventDefault();
	  	electron.shell.openExternal(url);
	});
})

app.on('window-all-closed', () => {
  	if (process.platform !== 'darwin') {
    	app.quit(); // OSX shit
  	}
})

app.on('activate', () => {
  	if (ApplicationWindow === null) {
    	createWindow('index'); // Makes window if one doesn't exist
  	}
})

ipcMain.on('change_folder', function(event, data) {
	switch(data) {
		case 'cemu':
			var settings = JSON.parse(fs.readFileSync('data/cache/settings.json')),
				emulators = JSON.parse(fs.readFileSync('data/cache/emulators.json'));

			var cemu_folder_path = pickEmuFolder(); // Popup for the Cemu folder

			settings["cemu_folder_path"] = cemu_folder_path[0];

			if (!fs.existsSync(cemu_folder_path[0]+'/dbghelp.dll')) { // Checks if  you have cemuhook
				var result = dialog.showMessageBox({
				  	type: 'question',
				  	message: 'Cemuhook not found. Would you like to download the latest version now?',
				  	buttons: ['Yes', 'No']
				});

				if (result == 0) {
					downloadFile("https://files.sshnuke.net/cemuhook_174d_0403.zip", cemu_folder_path[0], 'cemuhook.zip');
					// Is there a better way to do this besides scraping the site or hard-coding?
				}
			}

			var files = fs.readdirSync(cemu_folder_path[0]), // Scans Cemu folder
				executable = files.filter(/./.test, /\.exe$/i)[0]; // Finds the exe (could be renamed)

			var cemu = {folder_path: cemu_folder_path[0], exe_path: cemu_folder_path[0]+"\\"+executable, params: "-g"}; // makes emulator object
			fs.writeFile('data/cache/emulators.json', JSON.stringify({"cemu": cemu}), function(error) {
				// Saves it as `cemu` (More emulators can be added with their own options. Cemu is default)
			    if (error) {
			        logger.log('error', error);
			    }
			    fs.writeFile('data/cache/settings.json', JSON.stringify(settings), function(error) {
				    if (error) {
				        logger.log('error', error);
				    }
				    var result = dialog.showMessageBox({
					  	type: 'question',
					  	message: 'Setting changed. Restart required, Would you like to restart now?',
					  	buttons: ['Yes', 'No']
					});

					if (result == 0) {
						app.relaunch();
						app.quit();
					}
				});
			});
			break;
		case 'game':

			ApplicationWindow.loadURL(url.format({
			    pathname: path.join(__dirname, '/app/load_new_games.html'),
			    protocol: 'file:',
			    slashes: true
			}));

			var settings = JSON.parse(fs.readFileSync('data/cache/settings.json')),
				game_folder_path = pickGameFolder(),
				games = [],
				game_errors = [];

			settings["game_folder_path"] = game_folder_path[0];

			var gameDirs = getDirectories(game_folder_path[0]);
			async.forEachOf(gameDirs, function (game_index, i, callback) {

				var gamePath = game_folder_path+"\\"+game_index;

				isGame(gamePath, function(game, wud, productCode) {
					if (!game) {
				    	callback();
				    	return;
					}

					loadGameData(gamePath, game_index, wud, productCode, function(error, result) {
						if (error && !result) {
							logger.log('error', error);
							callback();
							return;
						}
						games.push(result);
						callback();
					});
				})
			}, function () {
				try {
					fs.writeFileSync('data/cache/settings.json', JSON.stringify(settings));
				} catch(error) {
					logger.log('error', error);
				}
				
			    fs.writeFile('data/cache/games.json', JSON.stringify(games), function(error) {
				    if (error) {
				        return logger.log('error', error);
				    }
				    var result = dialog.showMessageBox({
					  	type: 'question',
					  	message: 'Setting changed. Restart required, Would you like to restart now?',
					  	buttons: ['Yes', 'No']
					});

					if (result == 0) {
						app.relaunch();
						app.quit();
					}
				});
			});
		break;
	}
});


ipcMain.on('btn-window-option-minimize', function(event, data) {
	ApplicationWindow.minimize(); // Button in the top right
});
ipcMain.on('btn-window-option-maximize', function(event, data) {
	// Button in the top right
	if (!ApplicationWindow.isMaximized()) {
 		ApplicationWindow.maximize();
 	} else {
 		ApplicationWindow.unmaximize();
 	}
});
ipcMain.on('btn-window-option-close', function(event, data) {
	ApplicationWindow.close();    // Button in the top right
});

ipcMain.on('checkForUpdate', function(event, data) {
	checkForUpdate(true);
});

ipcMain.on('load_all_games_emulators', function(event, data) {

	checkForUpdate();

	var settings = JSON.parse(fs.readFileSync('data/cache/settings.json')),
		emulators = JSON.parse(fs.readFileSync('data/cache/emulators.json')),
		emulator_keys = Object.keys(emulators),
		emulators_list = "",
		games = JSON.parse(fs.readFileSync('data/cache/games.json')),
		game_keys = Object.keys(games),
		game_list = [];

	user_settings['game_folder_path'] = settings['cemu_folder_path'];
	user_settings['cemu_folder_path'] = settings['cemu_folder_path'];

	for (var e = emulator_keys.length - 1; e >= 0; e--) {
		emulators_list += '<a class="dropdown-item launch" launch-with="'+emulator_keys[e]+'" href="#">'+emulator_keys[e]+'</a>\n';
  	}
  	for (var g = game_keys.length - 1; g >= 0; g--) {
		game_list.push(games[game_keys[g]]);
  	}
  	if (settings["is_dark"]) {
  		event.sender.send("dark_theme");
  	}
  	var i = 0,
  		games_directory = getDirectories(settings["game_folder_path"]);
  	for (var j = 0; j < games_directory.length; j++) {
  		isGame(settings["game_folder_path"]+'\\'+games_directory[j], function(game, wud, productCode) {
  			if (game) {
	  			i++;
	  		}
  		});
  	}


  	if (game_list.length < i) {
  		var result = dialog.showMessageBox({
		  	type: 'question',
		  	message: 'Found ' + (i - games.length) + ' new game(s) in your games folder. Would you like to download the data now?',
		  	buttons: ['Yes', 'No']
		});

		if (result == 0) {
			var valid_paths = [];
			for (var k = 0; k < game_list.length; k++) {
				valid_paths.push(game_list[k]["folder"].replace(/\\/g, "/"));
			}
			for (var k = 0; k < games_directory.length; k++) {
				isGame(settings["game_folder_path"]+'\\'+games_directory[k], function(game, wud, productCode) {
					if (valid_paths.indexOf(settings["game_folder_path"].replace(/\\/g,"/")+'/'+games_directory[k]) < 0 && game) {

						ApplicationWindow.loadURL(url.format({
						    pathname: path.join(__dirname, '/app/load_new_games.html'),
						    protocol: 'file:',
						    slashes: true
						}));
						loadGameData(settings["game_folder_path"]+'\\'+games_directory[k], games_directory[k], wud, productCode, function (error, result) {
							if (error && !result) {
								logger.log('error', error);
								return;
							}
							console.log('Error with '+settings["game_folder_path"].replace(/\\/g,"/")+'/'+games_directory[k]);
							game_list.push(result);

							try {
								fs.writeFileSync('data/cache/games.json', JSON.stringify(game_list));
							} catch(error) {
								logger.log('error', error);
							}

							
							ApplicationWindow.loadURL(url.format({
							    pathname: path.join(__dirname, '/app/index.html'),
							    protocol: 'file:',
							    slashes: true
							}));
						});
					}
				});
			}
		}
  	}
  	if (game_list.length > i) {
  		for (var i = 0; i < game_list.length; i++) {
  			try {
				fs.statSync(game_list[i]['path']);
			} catch(error) {
				logger.log('error', error);
				game_list.splice(i, 1);
			}
  		}
  		fs.writeFile('data/cache/games.json', JSON.stringify(game_list), function(error) { // Saves the games object to a file
		    if (error) {
		        return logger.log('error', error);
		    }
		});
		dialog.showMessageBox({
		  	type: 'info',
		  	message: (games.length - i) + ' game(s) were removed from the games folder. Their data has been removed. Game list updated, display order of games may have changed as a result.'
		});
  	}
  	console.log('sss');
  	console.log(settings);

  	event.sender.send("games_emulators_loaded", {game_list:game_list, emulator_list: emulators_list, display:settings['display_mode'], settings:settings});
});


ipcMain.on('load_game_folder', function(event) {
	var game_folder_path = pickGameFolder(), // Popup for the game folder
		games = [], // Object storing the games
		game_errors = []; // Object storing errors

	console.log(':========Loading Game Folder========:');

	user_settings["game_folder_path"] = game_folder_path[0];

	event.sender.send("game_folder_loading");

	var gameDirs = getDirectories(game_folder_path[0]); // Gets the files/dirs in the game folder

	async.forEachOf(gameDirs, function (game_index, i, callback) {

		var gamePath = game_folder_path+"\\"+game_index;
		
		isGame(gamePath, function(game, wud, productCode) {
			if (!game) { // verifies that it's a game
		    	callback();
		    	return;
			}

			console.log(game_index)

			loadGameData(gamePath, game_index, wud, productCode, function (error, result) {
				if (error && !result) {
					logger.log('error', error);
					callback();
					return;
				}
				games.push(result);
				callback();
			});
		});
	}, function () {
	    fs.writeFile('data/cache/games.json', JSON.stringify(games), function(error) { // Saves the games object to a file
		    if (error) {
		        return logger.log('error', error);
		    }
		    event.sender.send("game_folder_loaded", {game_path:game_folder_path[0]}); // Tells application we're done
		});
	});
});

ipcMain.on('load_window_cemu_load', function(event, data) {
	ApplicationWindow.loadURL(url.format({
	    pathname: path.join(__dirname, '/app/load_cemu.html'), // Opens the application to load Cemu
	    protocol: 'file:',
	    slashes: true
	}))
});

ipcMain.on('load_cemu_folder', function(event) {

	var cemu_folder_path = pickEmuFolder(); // Popup for the Cemu folder

	user_settings["cemu_folder_path"] = cemu_folder_path[0];

	if (!fs.existsSync(cemu_folder_path[0]+'/dbghelp.dll')) { // Checks if  you have cemuhook
		var result = dialog.showMessageBox({
		  	type: 'question',
		  	message: 'Cemuhook not found. Would you like to download the latest version now?',
		  	buttons: ['Yes', 'No']
		});

		if (result == 0) {
			downloadFile("https://files.sshnuke.net/cemuhook_174d_0403.zip", cemu_folder_path[0], 'cemuhook.zip');
			// Is there a better way to do this besides scraping the site or hard-coding?
		}
	}

	var files = fs.readdirSync(cemu_folder_path[0]), // Scans Cemu folder
		executable = files.filter(/./.test, /\.exe$/i)[0]; // Finds the exe (could be renamed)

	var cemu = {folder_path: cemu_folder_path[0], exe_path: cemu_folder_path[0]+"\\"+executable, params: "-g"}; // makes emulator object
	fs.writeFile('data/cache/emulators.json', JSON.stringify({"cemu": cemu}), function(error) {
		// Saves it as `cemu` (More emulators can be added with their own options. Cemu is default)
	    if (error) {
	        logger.log('error', error);
	    }
	    fs.writeFile('data/cache/settings.json', JSON.stringify(user_settings), function(error) {
		    if (error) {
		        logger.log('error', error);
		    }
		    event.sender.send("cemu_folder_loaded", cemu); // Done
		});
	});
});

ipcMain.on('load_main_window', function(event, data) {
	ApplicationWindow.loadURL(url.format({
	    pathname: path.join(__dirname, '/app/index.html'), // Opens main window normally
	    protocol: 'file:',
	    slashes: true
	}));
});

ipcMain.on('change_theme', function(event, data) {
	var settings  = JSON.parse(fs.readFileSync('data/cache/settings.json'));
	if (data == 'dark') {
		settings['is_dark'] = true;
		user_settings['is_dark'] = true;
	} else {
		settings['is_dark'] = false;
		user_settings['is_dark'] = false;
	}
	fs.writeFile('data/cache/settings.json', JSON.stringify(settings), function(error) {
	    if (error) {
	        logger.log('error', error);
	    }
	    event.sender.send("theme_changed", data); // Done
	});
});

ipcMain.on('change_display', function(event, display) {
	var game_list = JSON.parse(fs.readFileSync('data/cache/games.json')),
		emulators_list = JSON.parse(fs.readFileSync('data/cache/emulators.json')),
		settings  = JSON.parse(fs.readFileSync('data/cache/settings.json'));
	settings['display_mode'] = display;
	fs.writeFile('data/cache/settings.json', JSON.stringify(settings), function(error) {
	    if (error) {
	        logger.log('error', error);
	    }
	    event.sender.send("display_changed", {game_list:game_list, emulator_list: emulators_list, display:display}); // Done
	});
});

ipcMain.on('launch_game_rom', function(event, data) {
	var emulator = data.emulator, // Which emulator to launch
		game     = data.rom; // Which game is it

	fs.readFile("data/cache/emulators.json", function (error, json) { // Read the emulators file
	  	if (error) {
	    	return logger.log('error', error);
	  	}
	  	json = JSON.parse(json.toString()); // Parse the shit
	  	emulator = json[emulator]; // Grab the emulator object
	  	var games = JSON.parse(fs.readFileSync('data/cache/games.json'));

		var then = moment();

	  	exec('"'+emulator["exe_path"]+'" '+emulator["params"]+' '+'"'+game+'"', (error, stdout, stderr) => {
	  	// Launch game with the emulator and params
		  	if (error) {
			    logger.log('error', error);
			    return;
		  	}

		  	var now = moment();

		  	var time = now.diff(then, 'milliseconds');
		  	console.log(time);

			for (var i = games.length - 1; i >= 0; i--) {
				if (games[i]['path'] == game) {
					var current_time = games[i]['play_time'],
						new_time = current_time += time;
					games[i]['play_time'] = new_time;
					try {
						fs.writeFileSync('data/cache/games.json', JSON.stringify(games));
					} catch(error) {
						logger.log('error', error);
					}
					event.sender.send("update_play_time", {new_time:new_time,game_path:game});
					break;
				}
			}
		});
	});
});

ipcMain.on('smm_dl_level', function(event, data) {
	var SMMLevelFolder = pickSMMLevelFolder()[0];

	async.waterfall([
		function(callback) {
			event.sender.send("smm_level_dl_start");
			zipFolder(SMMLevelFolder, SMMLevelFolder + '/backup.zip', function(error) {
			    if(error) {
			        logger.log('error', error);
			        callback(null);
			    } else {
			        callback(null);
			    }
			});
		},
		function(callback) {

			var received_bytes = 0,
				total_bytes = 0;

			var req = request({
		        method: 'GET',
		        uri: 'http://smmdb.ddns.net/courses/'+data
		    });

		    var out = fs.createWriteStream(SMMLevelFolder+'/new_level.zip');
		    req.pipe(out);

		    req.on('response', function(data) {
		        total_bytes = parseInt(data.headers['content-length']);
		    });

		    req.on('data', function(chunk) {
		        received_bytes += chunk.length;
		        var percent = (received_bytes * 100) / total_bytes;
		        event.sender.send("smm_level_progress", {progress: percent});
		    });

		    req.on('end', function() {
		    	callback(null);
		    });
		},
		function(callback) {
			event.sender.send("smm_level_extract");
			_7zip.extract(SMMLevelFolder+'\\new_level.zip', SMMLevelFolder).then(function() {
				callback(null);
			});
		},
		function(callback) {
			fs.unlink(SMMLevelFolder+'/new_level.zip', function() {
	    		callback(null);
	    	});
		},
		function(callback) {
			var dir = getDirectories(SMMLevelFolder)[0];
			fs.readdir(SMMLevelFolder+'\\'+dir, (error, files) => {
				if (error) {
					logger.log('error', error);
				}
				for (var i = 0; i < files.length; i++) {
					var file_data = fs.readFileSync(SMMLevelFolder+'\\'+dir+'\\'+files[i]);
					fs.writeFileSync(SMMLevelFolder+'\\'+files[i], file_data);
				}
			})
			callback(null, dir);
		},
		function(dir, callback) {
			fs.remove(SMMLevelFolder+'\\'+dir, error => {
			  	if (error) {
			  		logger.log('error', error);
			  		callback(null);
			  	}
			  	callback(null);
			})
			
		},
	], function() {
		event.sender.send("smm_level_dl_end");
	});

});

ipcMain.on('smm_search', function(event, data) {
	smm_api.search(data, function(response) {
		var response = JSON.parse(response);
		event.sender.send("smm_search_results", response.courses);
	});
});

ipcMain.on('start_update', function(event, version) {
	process.noAsar = true;
	ApplicationWindow.loadURL(url.format({
	    pathname: path.join(__dirname, '/app/download_update.html'), // Opens main window normally
	    protocol: 'file:',
	    slashes: true
	}));

	startUpdate(version, function() {
		process.noAsar = false;
		app.relaunch();
		app.quit();
	});
});


function generalLoad() {
	fs.stat("data", function (error, stats) { // is `data` a thing?
  		if (error) {
  			logger.log('error', error);
  			createDirectory("data"); // Nope! make it.
	  	}
	});
	fs.stat("data/cache", function (error, stats) { // is `data/cache` a thing?
  		if (error) {
  			logger.log('error', error);
  			createDirectory("data/cache"); // Nope! make it.
	  	}
	});
	if (!fs.existsSync('data/cache/emulators.json')) { // Is there an emualtors file? 
		createWindow('load_game_folder'); // Nope! Lets run the set up then!
	} else {
		createWindow('index'); // Yes! Run as normal, set up must have been done.
	}
}

function checkForUpdate(sendFeedback) {
	checkConnection('www.cemui.com', function(isConnected) {
    	if (!isConnected) {
			dialog.showMessageBox({
			  	type: 'question',
			  	message: 'Could not check for update.'
			});
			return false;
		}

		request.get('https://cemui.com/api/LatestVersion', function (error, response, body) {

			if (!error && response.statusCode == 200) {
				var data = JSON.parse(body.toString());
		    	if (data['error']) {
		    		
		    		logger.log('error', data['error']);

		    		dialog.showMessageBox({
					  	type: 'info',
					  	message: data['error']
					});
		    	} else {
		    		if (data['latest'] == APP_VERSION && sendFeedback) {
		    			dialog.showMessageBox({
						  	type: 'info',
						  	message: 'You are using the latest version.'
						});
						return true;
		    		}
		    		if (data['latest'] > APP_VERSION) {
		    			if (ApplicationWindow) {
					    	ApplicationWindow.webContents.send("update_available", {version: data['latest']});
					    }
		    		}
		    	}
			} else if (error) {
				logger.log('error', error);
			}
		});

	})
}

function startUpdate(version, cb) {
	async.waterfall([
		function(callback) {
			originalFs.createReadStream('resources/app.asar').pipe(fs.createWriteStream('resources/app_old.asar')).on('finish', function() {
				callback(null);
			});
		},
		function(callback) {
			originalFs.createReadStream('resources/electron.asar').pipe(fs.createWriteStream('resources/electron_old.asar')).on('finish', function() {
				callback(null);
			});
		},
		function(callback) {

			var received_bytes = 0,
    			total_bytes = 0;

			var req = request({
		        method: 'GET',
		        uri: 'https://cemui.com/api/releases/'+version+'/update_main.zip'
		    });

		    var out = originalFs.createWriteStream(path.join(__dirname, '../')+'/update_main.zip');
		    req.pipe(out);

		    req.on('response', function(data) {
		        total_bytes = parseInt(data.headers['content-length' ]);
		    });

		    req.on('data', function(chunk) {
		        received_bytes += chunk.length;
		        showProgress(received_bytes, total_bytes);
		    });

		    req.on('end', function() {
		    	callback(null);
		    });
		},
		function(callback) {
			unzip(path.join(__dirname, '../')+'/update_main.zip', path.join(__dirname, '../'), false, function() {
				callback(null);
	        });
		},
		function(callback) {
			fs.unlink(path.join(__dirname, '../update_main.zip'), function() {
	    		callback(null);
	    	});
		},
		function(callback) {
			fs.unlink(path.join(__dirname, '../app_old.asar'), function() {
	    		callback(null);
	    	});
		},
		function(callback) {
			fs.unlink(path.join(__dirname, '../electron_old.asar'), function() {
	    		callback(null);
	    	});
		}
	], cb );
}

function showProgress(received, total) {
    var percentage = (received * 100) / total;
    if (ApplicationWindow) {
    	ApplicationWindow.webContents.send("download_update_percent", {percentage: percentage});
    }
}

function createDirectory(path) { // Makes dirs
	try {
		fs.mkdir(path, function() {
			console.log("Created `"+path+"` folder");
		});
	} catch(error) {
		logger.log('error', error);
	}
}
function pickGameFolder() { // Picks dir
	var gameFolder = dialog.showOpenDialog({
		properties: ['openDirectory']});

	if (!gameFolder) {
		return pickGameFolder();
	}
	return gameFolder;
}
function pickEmuFolder() { // Picks dir
	var emuFolder = dialog.showOpenDialog({
		properties: ['openDirectory']});

	if (!emuFolder) {
		return pickEmuFolder();
	}
	return emuFolder;
}
function pickSMMLevelFolder() { // Picks dir
	var SMMLevelFolder = dialog.showOpenDialog({
		title: 'Select a Super Mario Maker level to overwrite.',
		defaultPath: user_settings['cemu_folder_path']+'\\mlc01\\emulatorSave',
		properties: ['openDirectory']
	});

	if (!SMMLevelFolder) {
		return pickSMMLevelFolder();
	}
	return SMMLevelFolder;
}
function loadGame(game) {
	// Currently unused. Will use later
}
function loadEmulator(path) {
	// Currently unused. Will use later
}
function getDirectories(src) {  // Gets dirs
  	return fs.readdirSync(src).filter(file => fs.statSync(path.join(src, file)).isDirectory());
}
function getProductCode(file, cb) {
	fs.open(file, 'r', function(status, fd) {
		if (status) {
				logger.log("error", "status.message = " + status.message);
				return;
		}
		// Gets first 10 bytes of file. Product code is 10 bytes
		var buffer = new Buffer(10);
		fs.read(fd, buffer, 0, 10, 0, function(err, num) {
			var productCode = buffer.toString('utf8', 0, num);
			return cb(productCode);
		});
	});
}

function isGame(folder, cb) { // Checks if it's a game or not

	var codeFile = fs.readdirSync(folder).filter(/./.test, /\.wud$/i);
	if (codeFile && codeFile.length > 0) {
		getProductCode(folder + "\\" + codeFile[0].toString(), function(productCode) {
			return cb(true, true, productCode);
		});
	} else {
		var subDirs = getDirectories(folder);
		if (typeof subDirs === undefined || subDirs.length < 0) {
			return cb(false, false, null);
		}

		if (Object.values(subDirs).indexOf('code') <= -1 || Object.values(subDirs).indexOf('content') <= -1 || Object.values(subDirs).indexOf('meta') <= -1) {
			return cb(false, false, null);
		}

		var codeFile = fs.readdirSync(folder+"\\code").filter(/./.test, /\.rpx$/i);

		if (!codeFile || codeFile.length <= 0) {
			return cb(false, false, null);
		}

		if (!fs.existsSync(folder+"\\meta\\meta.xml")) {
			return cb(false, false, null);
		}

		return cb(true, false, null);
	}
}



function loadGameData(gamePath, name, wud, productCode, cb) {

	if (wud) {
		var files = fs.readdirSync(gamePath),
			rom = files.filter(/./.test, /\.wud$/i), // finds the wud file
			dlPath = 'https://cemui.com/api/GetGame/?product_code=';
	} else {
		var files = fs.readdirSync(gamePath+"\\code"), // scans code dir
			rom   = files.filter(/./.test, /\.rpx$/i), // finds the rpx file
			dlPath = 'https://cemui.com/api/GetGame/?title_id=';
	}

	var rom = rom[0];

	var game = {}; // new key in the games object

	async.waterfall([
		function(callback) {
			if (!wud) {
				var xml = XMLParser.parse(gamePath+"\\meta\\meta.xml");

				if (!xml || typeof xml["title_id"] == 'undefined') {
					game["invalid"]     = 'true';
					game["title"]       = 'Invalid Game';
					game["playability"] = 'No playability data available for this title.';
					game["path"]        = gamePath+"\\code\\"+rom;
					game["folder"]      = gamePath;
					game["platform"]    = "Unknown";
			  		game["releaseDate"] = "Unknown";
			  		game["overview"]    = "The game located at `"+gamePath+"` was found to be invalid or corrupted. This is caused by CemuManager not being able to find the required meta tags for the game. This issue is generally caused by a blank/incomplete/invalid `meta.xml` file. As such, this game has been flagged as invalid, and will not run properly. The `Launch` button has been disabled. If you believe this to be an error please report it at https://github.com/RedDuckss/CemuManager/issues";
			  		game["ESRB"]        = "Unknown";
			  		game["players"]     = "Unknown";
			  		game["coop"]        = "Unknown";
			  		game["publisher"]   = "Unknown";
			  		game["developer"]   = "Unknown";
			  		game["background"]  = "data:png;base64," + base64_encode(path.join(__dirname, './cemumanagerlogo.png'));
			  		game["image"]       = "data:png;base64," + base64_encode(path.join(__dirname, './WiiU-box-generic.png'));

				    callback(true, game);
				} else {
					game["path"] = gamePath+"\\code\\"+rom; // Sets the full path to the game
					game["folder"] = gamePath;
					callback(null, xml);
				}
			} else {
				game["path"] = gamePath+"\\"+rom; // Sets the full path to the game
				game["folder"] = gamePath;
				callback(null, false);
			}
				
		},
	    function(xml, callback) {
	        checkConnection('www.cemui.com', function(isConnected) {
	        	if (!isConnected) {
					dialog.showMessageBox({
					  	type: 'question',
					  	message: 'Failed to connect to API when downloading data for '+name+'. Switching to offline placeholders.'
					});
					game["platform"]    = "Unknown";
			  		game["releaseDate"] = "Unknown";
			  		game["playability"] = 'No playability data available for this title.';
			  		game["overview"]    = "An overview for this game cannot be displayed. This is because an overview/description could not be properly downloaded for found for this game.";
			  		game["ESRB"]        = "Unknown";
			  		game["players"]     = "Unknown";
			  		game["coop"]        = "Unknown";
			  		game["publisher"]   = "Unknown";
			  		game["developer"]   = "Unknown";
			  		game["background"]  = "data:png;base64," + base64_encode(path.join(__dirname, './cemumanagerlogo.png'));
			  		game["image"]       = "data:png;base64," + base64_encode(path.join(__dirname, './WiiU-box-generic.png'));

			  		callback(true, game);
				} else {
					callback(null, xml);
				}
	        })
	    },
	    function(xml, callback) {

	    	if (wud) {
				var key = productCode;
			} else {
				var key = [xml["title_id"]["_Data"].slice(0, 8), '-', xml["title_id"]["_Data"].slice(8)].join('');
			}

	    	
	    	request.get(dlPath+key, function (error, response, body) {
				if (error) {
					logger.log('error', error);
		    		callback(true);
		    	}
		    	if (response.statusCode != 200) {
		    		callback(true);
		    	}

		    	var data = JSON.parse(body.toString());
		    	if (data['error']) {
		    		logger.log('error', data['error']);
		    		callback(true);
		    	}

		    	callback(null, data);
			});
	    },
	    function(data, callback) {
	    	if (!data['game_boxart_url'].trim()) {
		    	game["image"] = "data:png;base64," + base64_encode(path.join(__dirname, './WiiU-box-generic.png'));
		    	callback(null, data);
		    } else {
		    	request.get(data['game_boxart_url'], function (error, response, body) { // Pulls game data from online API
					if (error) {
						logger.log('error', error);
			    		callback(true);
			    	}
			    	if (response.statusCode != 200) {
			    		callback(true);
			    	}

			    	var image_data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64'); // base64
				    game["image"] = image_data; // stores the base64 for offline use

				    callback(null, data);
				});
		    }
	    },  function(data, callback) {
	    	if (!data['game_background_url'].trim()) {
		    	game["background"] = "data:png;base64," + base64_encode(path.join(__dirname, './cemumanagerlogo.png'));
		    	callback(null, data);
		    } else {
		    	request.get(data['game_background_url'], function (error, response, body) { // Pulls game data from online API
					if (error) {
						logger.log('error', error);
			    		callback(true);
			    	}
			    	if (response.statusCode != 200) {
			    		callback(true);
			    	}

			    	var image_data = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body).toString('base64'); // base64
				    game["background"] = image_data; // stores the base64 for offline use

				    callback(null, data);
				});
		    }
	    }, function(data, callback) {

    		game["title"]       = entities.encode(data['game_title'].toString()),
    		game["playability"] = entities.encode(data['game_playability'].toString()),
    		game["play_time"]   = 0,
	  		game["releaseDate"] = entities.encode(data['game_release_date'].toString()),
	  		game["overview"]    = entities.encode(data['game_overview'].toString()),
	  		game["ESRB"]        = entities.encode(data['game_esrb'].toString()),
	  		game["players"]     = entities.encode(data['game_max_players'].toString()),
	  		game["coop"]        = entities.encode(data['game_coop'].toString()),
	  		game["publisher"]   = entities.encode(data['game_publisher'].toString()),
	  		game["developer"]   = entities.encode(data['game_developer'].toString());

	    	callback(null, game);
	    }
	], cb );

}



function downloadFile(url, target, fileName, cb) { // I hope you understand this without me saying (PS, it downloads files)
    var req = request({
        method: 'GET',
        uri: url
    });

    var out = fs.createWriteStream(target+'/'+fileName);
    req.pipe(out);

    req.on('end', function() {
        unzip(target+'/'+fileName, target, function() {
        	if (cb) {
        		cb();
        	}
        });
    });
}
function unzip(file, target, alert, cb) { // Unzips

	var out = fs.createReadStream(file);
	out.pipe(
		unzipper.Extract({ path: target }).on('error', function(error) {
			
			logger.log('error', error);

			dialog.showMessageBox({
			  	type: 'error',
			  	message: 'There was an error unzipping file. Perhaps the file is corrupted?'
			});
		})).on('finish', function () {

		if (alert) {
			dialog.showMessageBox({
			  	type: 'question',
			  	message: 'Finished extracting to `'+target+'`'
			});
		}
		if (cb) {
			cb();
		}
	});
}

function checkConnection(url, cb) {
    dns.resolve(url, function(error) {
        if (error && error.code == "ENOTFOUND") {
        	logger.log('error', error);
            cb(false);
        } else {
            cb(true);
        }
    })
}

function isGamePath(path) {
	var settings = JSON.parse(fs.readFileSync('data/cache/settings.json')),
		folders = getDirectories(settings["game_folder_path"]);
	for (var i = 0; i < folders.length; i++) {
		console.log(settings["game_folder_path"]+"\\"+folders[i]);
	}
    return false;
}


function base64_encode(path) {
    return new Buffer(fs.readFileSync(path)).toString('base64');
}