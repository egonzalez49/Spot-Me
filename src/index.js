const electron = require('electron')
const path = require('path')
const BrowserWindow = electron.remote.BrowserWindow

const login = document.getElementById('login')
const artistList = document.getElementById('artistlist')
artistList.style.visibility = 'hidden';
const songList = document.getElementById('songlist')
songList.style.visibility = 'hidden';

const axios = require('axios')
const superagent = require('superagent');
const express = require('express')
const app = express();
const ipc = electron.ipcRenderer

var Promise = require('promise');
var SpotifyWebApi = require('spotify-web-api-node');

//Authentication Variables
var redirect_uri = 'http://localhost:5000/callback';
var client_id = 'b413dae4cf6943de8286e1a9d8c4eb65';
var client_secret = '0584097fe6c54f6eae92e3f063c624a8';
var state = 'spotify_auth_state';
var scopes = ['user-top-read'],
  redirectUri = redirect_uri,
  clientId = client_id,
  clientSecret = client_secret,
  state = state;

//API Wrapper Instantiation
var spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri
});

//Authentication URL
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

//Authentication Window
var authWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    'node-integration': false,
    'web-security': false
});

var authUrl = authorizeURL;

//When the Authentication Token Expires
var tokenExpirationEpoch;
//Authentication Code
var code = null;
var artistIDs = [];
var songIDs = [];

//Receives the Callback when Spotify Authentication Completed
app.get('/callback', function(req, res) {
  code = req.query.code || null;
  var statereturned = req.query.state || null;

  spotifyApi.authorizationCodeGrant(code).then(
    function(data) {
      // Set the Access Token and Refresh Token
      spotifyApi.setAccessToken(data.body['access_token']);
      ipc.send("save-code", data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);

      // Save the amount of seconds until the access token expired
      // tokenExpirationEpoch =
      //   new Date().getTime() / 1000 + data.body['expires_in'];
      // console.log(
      //   'Retrieved token. It expires in ' +
      //     Math.floor(tokenExpirationEpoch - new Date().getTime() / 1000) +
      //     ' seconds!'
      // );

      spotifyApi.getMyTopArtists({ limit: 10, time_range: 'short_term' }).then(
        function(data) {
          console.log('Top Artists', data.body.items);

          var topArtists = data.body.items;
          artistList.style.visibility = 'visible';

          while (artists.firstChild) {
            artists.removeChild(artists.firstChild);
          }

          topArtists.forEach(function(artist) {
            console.log(artist.name);
            var node = document.createElement("li");
            var textnode = document.createTextNode("" + artist.name);
            textnode.onclick = "viewArtist(i)";
            var imgnode = document.createElement("img");
            imgnode.src = artist.images[2].url;
            node.appendChild(imgnode);
            node.appendChild(textnode);
            node.onclick = function() { viewArtist(Array.prototype.indexOf.call(artists.childNodes, node)); };
            artists.appendChild(node);

            artistIDs.push(artist.id);
          });
        },
        function(err) {
          console.error(err);
        }
      );

      spotifyApi.getMyTopTracks({ limit: 10, time_range: 'short_term' }).then(
        function(data) {
          console.log('Top Tracks', data.body.items);

          var topSongs = data.body.items;
          songList.style.visibility = 'visible';

          topSongs.forEach(function(song) {
            console.log(song.name);
            var node = document.createElement("li");
            var textnode = document.createTextNode("" + song.name);
            var imgnode = document.createElement("img");
            imgnode.src = song.album.images[2].url;
            node.appendChild(imgnode);
            node.appendChild(textnode);
            node.onclick = function() { viewArtist(Array.prototype.indexOf.call(songs.childNodes, node)); };
            songs.appendChild(node);

            songIDs.push(song.id);
          });
        },
        function(err) {
          console.error(err);
        }
      );


    },
    function(err) {
      console.log(
        'Something went wrong when retrieving the access token!',
        err.message
      );
    }
  );

  authWindow.close();
});

// Continually print out the time left until the token expires..
var numberOfTimesUpdated = 0;

console.log('Listening on 5000');
app.listen(5000);

login.addEventListener('click', function (event) {
  login.style.display = 'none';
  authWindow.loadURL(authUrl);
  authWindow.show();
  event.preventDefault();
})

var toggle_artist = 0; //Short-term = 0, Medium-term = 1, Long-term = 2
var toggle_song = 0;

function toggleArtist() {
  if (toggle_artist === 0) {
    toggle_artist = 1;
    document.getElementById('artistToggle').src = "../assets/images/mediumterm.png"
    document.getElementById('artistTerm').innerHTML = "Medium Term";
  } else if (toggle_artist === 1) {
    toggle_artist = 2;
    document.getElementById('artistToggle').src = "../assets/images/longterm.png"
    document.getElementById('artistTerm').innerHTML = "Long Term";
  } else {
    toggle_artist = 0;
    document.getElementById('artistToggle').src = "../assets/images/shortterm.png"
    document.getElementById('artistTerm').innerHTML = "Short Term";
  }

  newFilter(toggle_artist, toggle_song);
}

function toggleSong() {
  if (toggle_song === 0) {
    toggle_song = 1;
    document.getElementById('songToggle').src = "../assets/images/mediumterm.png"
    document.getElementById('songTerm').innerHTML = "Medium Term";
  } else if (toggle_song === 1) {
    toggle_song = 2;
    document.getElementById('songToggle').src = "../assets/images/longterm.png"
    document.getElementById('songTerm').innerHTML = "Long Term";
  } else {
    toggle_song = 0;
    document.getElementById('songToggle').src = "../assets/images/shortterm.png"
    document.getElementById('songTerm').innerHTML = "Short Term";
  }

  newFilter(toggle_artist, toggle_song);
}

function newFilter(valueArtist, valueSong) {
  var artistRange, songRange;
  if (valueArtist === 0) {
    artistRange = "short_term";
  } else if (valueArtist === 1) {
    artistRange = "medium_term";
  } else {
    artistRange = "long_term";
  }

  if (valueSong === 0) {
    songRange = "short_term";
  } else if (valueSong === 1) {
    songRange = "medium_term";
  } else {
    songRange = "long_term";
  }

  artistIDs = [];
  songIDs = [];

  spotifyApi.getMyTopArtists({ limit: 10, time_range: artistRange }).then(
    function(data) {
      console.log('Top Artists', data.body.items);

      var topArtists = data.body.items;
      artistList.style.visibility = 'visible';

      while (artists.firstChild) {
        artists.removeChild(artists.firstChild);
      }

      topArtists.forEach(function(artist) {
        console.log(artist.name);
        var node = document.createElement("li");
        var textnode = document.createTextNode("" + artist.name);
        var imgnode = document.createElement("img");
        imgnode.src = artist.images[2].url;
        node.appendChild(imgnode);
        node.appendChild(textnode);
        node.onclick = function() { viewArtist(Array.prototype.indexOf.call(artists.childNodes, node)); };
        artists.appendChild(node);

        artistIDs.push(artist.id);
      });
    },
    function(err) {
      console.error(err);
    }
  );

  spotifyApi.getMyTopTracks({ limit: 10, time_range: songRange }).then(
    function(data) {
      console.log('Top Tracks', data.body.items);

      var topSongs = data.body.items;
      songList.style.visibility = 'visible';

      while (songs.firstChild) {
        songs.removeChild(songs.firstChild);
      }

      topSongs.forEach(function(song) {
        console.log(song.name);
        var node = document.createElement("li");
        var textnode = document.createTextNode("" + song.name);
        var imgnode = document.createElement("img");
        imgnode.src = song.album.images[2].url;
        node.appendChild(imgnode);
        node.appendChild(textnode);
        node.onclick = function() { viewArtist(Array.prototype.indexOf.call(songs.childNodes, node)); };
        songs.appendChild(node);

        songIDs.push(song.id);
      });
    },
    function(err) {
      console.error(err);
    }
  );
}

function viewArtist(value) {
  console.log(value);

  ipc.send("save-artist", code, artistIDs[value]);
  ipc.send("artist-window");
  //Artist Window
  // var artistWindow = new BrowserWindow({
  //     width: 800,
  //     height: 600,
  //     show: false,
  //     'node-integration': false,
  //     'web-security': false
  // });
  //
  // artistWindow.webContents.openDevTools();
  //
  // artistWindow.loadFile("src/artist.html");
  // artistWindow.show();
  //
  // artistWindow.on('closed', () => {
  //   artistWindow = null
  // })
}
