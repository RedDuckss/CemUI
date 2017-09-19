const {ipcRenderer} = require('electron'); // Gets ipcRenderer
ipcRenderer.send('open_dev');
var games_lib = document.getElementById('games-grid'),
    modal_list  = document.getElementById('modal-content-list'),
    modal_template = document.getElementById('TEMPLATE_gameModal'),
    modal_suggest_template = document.getElementById('TEMPLATE_gameModal_suggest'),
    modal_open = false,
    clicks = 0,
    emulators_list,
    input_id_counter = 0;

function addEvent(object, event, func) {
    object.addEventListener(event, func, true);
}

addEvent(window, 'keypress', function(event) {
    if (event.charCode == 112) {
        ipcRenderer.send('open_dev');
    }
});

addEvent(document.getElementById('select_cemu').getElementsByClassName('button')[0], 'click', function() {
    if (this.classList.contains('disabled')) {
        return false;
    }
    this.classList.add('disabled');
    ipcRenderer.send('load_cemu_folder');
});

addEvent(document.getElementById('select_games').getElementsByClassName('button')[0], 'click', function() {
    if (this.classList.contains('disabled')) {
        return false;
    }
    ipcRenderer.send('load_games_folder');
});

ipcRenderer.on('emulator_list', function(event, data) {
    emulators_list = data;
})

ipcRenderer.on('show_screen', function(event, data) {
    document.getElementById('screen_start').style.display = "none";
    document.getElementById('select_games').style.display = "none";
    document.getElementById('select_cemu').style.display = "none";
    if (data.cemu) {
        openScreen('select_cemu');
    }
    if (data.games) {
        openScreen('select_games');
    }
    if (data.welcome){
        openScreen('screen_start');
    }
});

ipcRenderer.on('update_status',function(e,data) {
    
    if (data.type == "available") {
        openScreen('screen_update');
        document.getElementById('update_txt').innerHTML = "Update available";
        document.getElementById('update_button').innerHTML = "Start updating";
        document.getElementById('update_button').onclick = function () {
            ipcRenderer.send('download_update');
            this.onclick = "";
            this.innerHTML = "downloading";
        };
    } else if (data.type == "progress")  {
        document.getElementById('update_txt').innerHTML = "Loading";
        document.getElementById('progress_update').style.width = data.progress.percent + '%';
        console.log(data.progress);
    } else if (data.type == "completed") {
        document.getElementById('update_txt').innerHTML = "Applying update";
        document.getElementById('update_button').innerHTML = "applying";
        document.getElementById('update_button').onclick = '';
        ipcRenderer.send('apply_update');
    }
    
});

ipcRenderer.on('cemu_folder_loaded', function(event, data) {
    var button = document.getElementById('select_cemu').getElementsByClassName('button')[0];
    console.log(button);
    setTimeout(function () {
        closeScreen(document.getElementById('select_cemu').getElementsByClassName('button')[0]);
    },1000);
});

ipcRenderer.on('games_folder_loaded', function(event, data) {
    var button = document.getElementById('select_games').getElementsByClassName('button')[0];
    console.log(button);
    closeScreen(button);
});

ipcRenderer.on('game_folder_loading', function(event, data) {
    var button = document.getElementById('select_games').getElementsByClassName('button')[0];
        spinner = document.createElement('span');
    button.classList.add('disabled');
    button.innerHTML = '(This may take a moment) Downloading game data... ';
    spinner.classList = 'fa fa-spinner fa-spin';
    button.appendChild(spinner);
    
});

ipcRenderer.on('init_complete', function(event, data) {
    setTimeout(function () {
        var games = data.library;
        for (var i=0,length = games.length ;i<length;i++) {
            var game = games[i],
                wrapper = document.createElement('div'),
                fav = document.createElement('i'),
                box = document.createElement('div');

            createModal(game);

            wrapper.setAttribute('data-modal-id', game.title_id);
            wrapper.className = 'grid-item';

            if (game.is_favorite) {
                wrapper.classList.add('highlight');
                fav.classList = 'txt-s-24 fa fa-times grid-icon favicon';
            } else {
                fav.classList = 'txt-s-16 fa fa-star grid-icon favicon';
            }
            fav.setAttribute('aria-hidden','true');
            fav.onclick = function () {
                updateFavorite(this);
            }
            preload(game.boxart);
            box.style.backgroundImage = 'url("' + game.boxart + '")';
            box.classList = 'boxart';
            box.onclick = function() {
                clicks++;
                if (clicks === 1) {
                    clicktimer = setTimeout(function() {
                        clicks = 0;
                        closeExpandModal(document.getElementById(this.parentElement.getAttribute('data-modal-id')).children[0].children[1]);
                        openModal(this.parentElement.getAttribute('data-modal-id'));
                    }.bind(this), 400);
                } else if (clicks === 2) {
                    clearTimeout(clicktimer);
                    clicks = 0;
                    ipcRenderer.send('play_rom', this.parentElement.getAttribute('data-modal-id'));
                }
            }

            wrapper.appendChild(fav);
            wrapper.appendChild(box);

            games_lib.appendChild(wrapper);
        }

        addToGrid(data.suggested,'suggest_grid');
        addToGrid(data.most_played,'most_grid');

        var count = games.length;
        var high = document.getElementsByClassName('highlight')[0];
            if (typeof high != 'undefined') {
                count = count + 3;
            }
        count = 15 - count;
        for (var i=0;i<count;i++) {
            var item = document.createElement('div');
            item.classList = "grid-item filler-grid-item";
            games_lib.appendChild(item);
        }

        document.getElementById('main').style.display = 'grid';
        openModal('modal1');
        setTimeout(function () {
            closeModal();
        },1000);
        setTimeout(function () {
            closeScreen(document.getElementById('loading'),true);
        },2000);

        createCemuDropdowns();

        /*
        ipcRenderer.send('smm_search_courses', {
            title: 'sand'
        });
        */
    },0); //This is to let the rendering catch up before proceeding.
});

addEvent(window, 'load', function() {
    ipcRenderer.send('init');
});

function addToGrid(arr,id) {
    var children = document.getElementById(id).children;
    for (var i=0,length = children.length ;i<length;i++) {
        if (typeof arr[i] != 'undefined') {

            var wrapper = children[i],
                box = document.createElement('div'),
                game = arr[i];
            
            if (typeof game.game_boxart_url == 'undefined') {
                preload(game.boxart);
                box.style.backgroundImage = 'url("' + game.boxart + '")';
                wrapper.setAttribute('data-modal-id', game.title_id);
            } else {
                preload(game.game_boxart_url);
                box.style.backgroundImage = 'url("' + game.game_boxart_url + '")';
                wrapper.setAttribute('data-modal-id', game.game_title_id);
                createModal(game,true);
            }
            box.classList = 'boxart';
            box.onclick = function() {
                openModal(this.parentElement.getAttribute('data-modal-id'));
            }

            wrapper.appendChild(box);
        }
    }
}

function dropdown(el) {
    var items = el.parentElement.children[1];
    var icon = el.getElementsByClassName('fa').item(0).classList;
    if (items.classList.contains('visible')) {
        closeDropdown();
    } else {
        closeDropdown();
        items.classList.add('visible');
        icon.remove('fa-caret-down');
        icon.add('fa-caret-up');
    }
}

function preload(url) {
    heavyImage = new Image();
    heavyImage.src = url;
}

function createCemuDropdowns() {
    var dropdown_list = document.getElementsByClassName('dropdownbutton cemudropdown launchgame');
    for (var i=0;i<dropdown_list.length;i++) {
        var items = dropdown_list[i].getElementsByClassName('items')[0];
        items.innerHTML = '';
        for (var j=0;j<emulators_list.length;j++) {
            var emulator = emulators_list[j],
                item = document.createElement('div');
            
            item.className = 'item';
            item.innerHTML = emulator.name;
            item.onclick = function() {
                ipcRenderer.send('play_rom', {emu: emulator.name, rom: this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.id});        
                closeDropdown();
            }

            items.appendChild(item)
        }
    }

    var dropdown_list = document.getElementsByClassName('dropdownbutton cemudropdown shortcut');
    for (var i=0;i<dropdown_list.length;i++) {
        var items = dropdown_list[i].getElementsByClassName('items')[0];
        items.innerHTML = '';
        for (var j=0;j<emulators_list.length;j++) {
            var emulator = emulators_list[j],
                item = document.createElement('div');
            
            item.className = 'item';
            item.innerHTML = emulator.name;
            item.onclick = function() {
                ipcRenderer.send('make_shortcut', {emu: emulator.name, rom: this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.id});        
                closeDropdown();
            }

            items.appendChild(item)
        }
    }
}

function createModal(game, isSuggest) {
    if  (isSuggest) {
        var modal = modal_suggest_template.content.firstElementChild.cloneNode(true);
        modal.onclick = function(event) {
            closeModal();
        }
        modal.children[0].onclick = function(event) {
            event.stopPropagation();
        }
        modal.id = game.game_title_id;
        modal.querySelector('.art > img').src = game.game_boxart_url;
        modal.querySelector('.title > h2').innerHTML = game.game_title_clean;
        modal.querySelector('.desc > .txt-desc').innerHTML = game.game_overview;
        modal.querySelector('.desc > .txt-play').innerHTML = game.game_playability;
        modal.querySelector('.button-visit').href = 'http://www.nintendo.com/games/detail/' + game.game_slug;

        //screenshots here?
        // how does suggest modals get screenshots??  <<<------
        
    } else {
        var modal = modal_template.content.firstElementChild.cloneNode(true);
        modal.onclick = function(event) {
            closeModal();
        }
        modal.children[0].onclick = function(event) {
            event.stopPropagation();
        }
        modal.id = game.title_id;
        modal.querySelector('.art > img').src = game.boxart;
        modal.querySelector('.modal-grid-game-settings .art > img').src = game.boxart;
        modal.querySelector('.title > h2').innerHTML = game.name;
        modal.querySelector('.desc > p').innerHTML = game.description;
        modal.querySelector('.folder-button').onclick = function() {
                ipcRenderer.send('show_rom', this.parentElement.parentElement.parentElement.parentElement.id);
        }
        modal.querySelector('.shortcut-button').onclick = function() {
                ipcRenderer.send('make_shortcut', {emu: 'Default', rom: this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.id});
        }
        modal.querySelector('.shortcut-button-dropdown').onclick = function () {
                dropdown(this.parentElement);
        }
        modal.querySelector('.play-button').onclick = function() {
                ipcRenderer.send('play_rom', {emu: 'Default', rom: this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.id});
        }
        modal.querySelector('.play-button-dropdown').onclick = function () {
                dropdown(this.parentElement);
        }
        modal.querySelector('.game-settings-button').onclick = function() {
            expandModal(this);
        }
        modal.querySelector('.savesettings .fa').onclick = function () {
                dropdown(this.parentElement);
        }
        for (var i=0;i<modal.querySelectorAll('input').length;i++) {
            modal.querySelectorAll('input')[i].id = 'input_id_' + input_id_counter;
            modal.querySelectorAll('label')[i].setAttribute('for','input_id_' + input_id_counter);
            input_id_counter++;
        }
        
        for (var i=0;i<game.screenshots.length;i++) {
                var screenshot_url = game.screenshots[i],
                    screenshot = document.createElement('img');
                screenshot.src  = screenshot_url;
                screenshot.classList = 'screenshot';

                screenshot.onclick = function() {
                    if (this.className.match(/\bactive\b/)) {
                        this.classList.remove('active');
                    } else {
                        var actives = document.getElementsByClassName('screenshot active');
                        for (var j=0;j<actives.length;j++) {
                            var active = actives[j];
                            active.classList.remove('active');
                        }
                        this.classList.add('active');
                    }
                }

                modal.querySelector('.ss').appendChild(screenshot);
        }
    }
    modal_list.appendChild(modal);
    }
function closeModal() {
    var modal = document.getElementsByClassName('selected-modal')[0];
    modal.style.opacity = "0";
    setTimeout(function () {
        document.getElementsByClassName('selected-modal')[0].style.display = "none";
        document.getElementsByClassName('selected-modal')[0].classList.remove('selected-modal');
    },500);
    document.getElementById('main').classList.remove('blur');
    modal_open = false;
}
function openModal(id) {
    if (document.getElementsByClassName('selected-modal').length > 0) closeModal();
    var modal = document.getElementById(id);
    modal.style.opacity = "0";
    modal.style.display = "block";
    modal.classList.add('selected-modal');
    setTimeout(function () {
        modal.style.opacity = "1";
    },250);
    document.getElementById('main').classList.add('blur');
    modal_open = true;
}
function expandModal(el) {
    var grid = el.parentElement.parentElement;
    var expandgrid = grid.parentElement.children[2];
    grid.style.left = "-110%";
    expandgrid.style.left = "0";
}
function closeExpandModal(el) {
    console.log("closing");
    var grid = el;
    var expandgrid = grid.parentElement.children[2];
    grid.style.left = "0";
    expandgrid.style.left = "100%";
}
function closeScreen(el,bool) {
    el.parentElement.style.opacity = "0";
    el.parentElement.parentElement.classList.add('closed');
    if (document.getElementById('screen_start').classList.contains('closed') &&
        document.getElementById('select_games').classList.contains('closed') &&
        document.getElementById('select_cemu').classList.contains('closed') &&
       !bool) {
        ipcRenderer.send('init');
    }
    setTimeout(function () {
        el.parentElement.parentElement.style.opacity = "0";
        setTimeout(function () {
            el.parentElement.parentElement.style.display = "none";
            el.parentElement.style.opacity = "1";
        },1000);
    },750);
}
function openScreen(id) {
    var el = document.getElementById(id);
    el.style.display = "inline-block";
    el.classList.remove('closed');
    setTimeout(function () {
        el.style.opacity = "1";
    },100);
}

function closeDropdown() {
    var dropdowns = document.getElementsByClassName('visible');
    for (var i = 0; i < dropdowns.length; i++) {
        var icon = dropdowns.item(i).parentElement.getElementsByClassName('fa').item(0).classList;
        dropdowns.item(i).classList.remove('visible');
        icon.remove('fa-caret-up');
        icon.add('fa-caret-down');
    }
}


function updateFavorite(el) {
    if(el.parentElement.classList.contains('highlight')) {
        removeFavorite(el);
    } else {
        var high = document.getElementsByClassName('highlight')[0];
        if (typeof high != 'undefined') {
            var icon = high.children[0];
            removeFavorite(icon);
        }
        setFavorite(el);
    }
}

function removeFavorite(el) {
    el.classList.remove('fa-times');
    el.classList.remove('txt-s-24');
    el.classList.add('fa-star');
    el.classList.remove('txt-s-16');
    el.parentElement.classList.remove('highlight');
    var count = 15 - games_lib.children.length;
    for (var i=0;i<count;i++) {
        var item = document.createElement('div');
        item.classList = "grid-item filler-grid-item";
        games_lib.appendChild(item);
    }
    ipcRenderer.send('remove_favorite', el.parentElement.getAttribute('data-modal-id'));
}

function setFavorite(el) {
    el.classList.remove('fa-star');
    el.classList.remove('txt-s-16');
    el.classList.add('fa-times');
    el.classList.add('txt-s-24');
    el.parentElement.classList.add('highlight');
    var items = document.getElementsByClassName('filler-grid-item');
    if (items.length > 0) {
        try {
            games_lib.removeChild(items[0]);
            games_lib.removeChild(items[1]);
            games_lib.removeChild(items[2]);
        } catch(ex) {
            console.log(ex)
        }
    }
    ipcRenderer.send('set_favorite', el.parentElement.getAttribute('data-modal-id'));
}

var modalList = document.getElementsByClassName('modal');
for(var i = 0, length = modalList.length; i < length; i++)
{
    modalList.item(i).onclick = function(event) {
        closeModal();
    }
}

var modalchildList = document.getElementsByClassName('modal-content');
for(var i = 0, length = modalchildList.length; i < length; i++)
{
    modalchildList.item(i).onclick = function(event) {
        event.stopPropagation();
    }
}


var closeList = document.getElementsByClassName('close');
for(var i = 0, length = closeList.length; i < length; i++)
{
    closeList.item(i).onclick = function() {
        closeModal();
    }
}