ipcRenderer = window.ipcRenderer; // Gets ipcRenderer
var games_lib = document.querySelector('#library'),
    recents_lib = document.querySelector('#recent'),
    modal_list  = document.querySelector('#modal-content-list'),
    modal_open = false,
    clicks = 0,
    emulators_list;

function addEvent(object, event, func) {
    object.addEventListener(event, func, true);
}

addEvent(document.getElementById('menu_button'),'click',function() {
    ipcRenderer.send('open_menu');
});

ipcRenderer.on('emulator_list', function(event, data) {
    emulators_list = data;
})



ipcRenderer.on('init_complete', function(event, data) {
    console.log('init main.js flux');
    ipcRenderer.send('theme_finished_loading');
    setTimeout(function () {
        var games = data.library;
        games_lib.innerHTML = '';
        for (var i=0,length = games.length ;i<length;i++) {
            let game = games[i],
                item = document.getElementById("TEMPLATE_GAME_ITEM").content.firstElementChild.cloneNode(true);

            preload(game.grid);
            item.style.backgroundImage = 'url("' + game.grid + '")';
            item.querySelector('p').innerHTML = game.name + ' <span>' + game.region + '</span>';
            
            addEvent(item, 'click', () => {
                // modal shit here
                alert('Open modal');
            });

            games_lib.appendChild(item);
        }

        let recent_sorted = games.sort((a, b) => {
            return b.last_stopped - a.last_stopped;
        });

        recents_lib.innerHTML = '';
        for (var i=0,length = recent_sorted.length ;i<length;i++) {
            let game = recent_sorted[i],
                item = document.getElementById("TEMPLATE_GAME_ITEM").content.firstElementChild.cloneNode(true);

            preload(game.grid);
            item.style.backgroundImage = 'url("' + game.grid + '")';
            item.querySelector('p').innerHTML = game.name + ' <span>' + game.region + '</span>';

            addEvent(item, 'click', () => {
                // modal shit here
                openModal(game.title_id);
            });

            recents_lib.appendChild(item);
        }
    }, 0);
});

ipcRenderer.send('init');



function preload(url) {
    heavyImage = new Image();
    heavyImage.src = url;
}


//FLUX JS

//flux clock
var col = true;
function clock() {
    var time = new Date(),
        hours = time.getHours() % 24,
        minutes = time.getMinutes(),
        mid = 'am';
    if( hours == 0 ) { 
        hours=12;
    }
    else if( hours > 12 ) {
        hours = hours%12;
        mid = 'pm';
    }
    
    
    document.getElementById('clock').innerHTML = harold(hours) + ':' + harold(minutes) + " " + mid;
  
  function harold(standIn) {
    if (standIn < 10) {
      standIn = '0' + standIn
    }
    return standIn;
  }
    
}
clock();
setInterval(clock, 1000);

addEvent(games_lib, 'mousewheel', (event) => {
    games_lib.scrollLeft += -(event.wheelDelta/3);
    return false;
});
addEvent(recents_lib, 'mousewheel', (event) => {
    recents_lib.scrollLeft += -(event.wheelDelta/3);
    return false;
});