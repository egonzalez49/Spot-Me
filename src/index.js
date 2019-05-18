const electron = require('electron')
const path = require('path')
const BrowserWindow = electron.remote.BrowserWindow

const login = document.getElementById('login')
const artistList = document.getElementById('artistlist')
artistList.style.visibility = 'hidden';
const songList = document.getElementById('songlist')
songList.style.visibility = 'hidden';
const recommended = document.getElementById('recArtists')
const recDiv = document.getElementById('recommended')
recDiv.style.visibility = 'hidden';
const playlists = document.getElementById('playlists')

const axios = require('axios')
const superagent = require('superagent');
const express = require('express')
const app = express();
const ipc = electron.ipcRenderer

var recURLs = [];
var soundPlayer;
var recNames = [];
var soundURIs = [];
var playlist = [];
var playlistIDs = [];

var Promise = require('promise');
var SpotifyWebApi = require('spotify-web-api-node');
var {Howl, Howler} = require('howler')

//Authentication Variables
var redirect_uri = 'http://localhost:5000/callback';
var client_id = 'b413dae4cf6943de8286e1a9d8c4eb65';
var client_secret = '0584097fe6c54f6eae92e3f063c624a8';
var state = 'spotify_auth_state';
var scopes = ['user-top-read', 'playlist-read-private', 'playlist-modify-public', 'playlist-modify-private', 'user-read-private'],
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
          //console.log('Top Artists', data.body.items);

          var topArtists = data.body.items;
          artistList.style.visibility = 'visible';

          while (artists.firstChild) {
            artists.removeChild(artists.firstChild);
          }

          topArtists.forEach(function(artist) {
            var node = document.createElement("li");
            node.className = "media mt-3";
            //node.setAttribute("id", "list-item");
            var textnode = document.createTextNode("" + artist.name);
            // var span = document.createElement("span");
            // span.appendChild(document.createTextNode("" + artist.popularity));
            // span.className = "badge badge-primary badge-pill";
            // textnode.insertAdjacentElement("beforeend",span);
            var div = document.createElement("div");
            div.className = "media-body";
            div.appendChild(textnode);
            // var span = document.createElement("span");
            // span.className = "badge badge-primary badge-pill";
            // span.setAttribute("id", "popular");
            // span.innerHTML = "" + artist.popularity;
            // textnode.appendChild(span);
            textnode.onclick = "viewArtist(i)";
            var imgnode = document.createElement("img");
            imgnode.className = " align-self-center mr-3";
            imgnode.setAttribute("id", "resize");
            imgnode.src = artist.images[2].url;
            node.appendChild(imgnode);
            node.appendChild(div);
            node.onclick = function() { viewArtist(Array.prototype.indexOf.call(artists.childNodes, node)); };
            artists.appendChild(node);

            artistIDs.push(artist.id);
          });

          var seed_artists = [];
          for (var i = 0; i < 4; i++) {
            seed_artists.push(artistIDs[i]);
          }

          console.log("Seed Artists: " + seed_artists);

          spotifyApi.getRecommendations({ limit: 10,  seed_artists }).then(
            function(data) {
              //console.log('Recommended Artists', data.body);

              var recArtists = data.body.tracks;
              recDiv.style.visibility = 'visible';

              while (recommended.firstChild) {
                recommended.removeChild(recommended.firstChild);
              }

              recArtists.forEach(function(song) {
                var node = document.createElement("li");
                node.className = "mt-3";
                var textnode = document.createTextNode("" + song.name);
                var imgnode = document.createElement("img");
                imgnode.src = song.album.images[2].url;
                imgnode.setAttribute("id", "photo2");
                imgnode.className = "mr-3";

                var playnode = document.createElement("img");
                playnode.src = "../assets/images/play.png";
                playnode.setAttribute("id", "play");
                node.appendChild(imgnode);
                node.appendChild(textnode);
                node.appendChild(playnode);
                var savenode = document.createElement("img");
                savenode.src = "../assets/images/save.png";
                savenode.setAttribute("id", "play");
                savenode.onclick = function () { openModal(Array.prototype.indexOf.call(recommended.childNodes, savenode.parentNode)); };
                node.appendChild(savenode);
                playnode.onclick = function() { playPreview(Array.prototype.indexOf.call(recommended.childNodes, playnode.parentNode)); };
                //node.onclick = function() { viewArtist(Array.prototype.indexOf.call(songs.childNodes, node)); };
                recommended.appendChild(node);
                soundURIs.push(song.uri);
                recURLs.push({name: song.name, preview: song.preview_url});
                if(song.preview_url === null) {

                    spotifyApi.getTrack(song.id, { market:'US' }).then(
                      function(data) {
                        //console.log('Track', data.body);
                        for (var i = 0; i < recURLs.length; i++) {
                          if (data.body.name === recURLs[i].name) {
                            recURLs[i].preview = data.body.preview_url;
                            //console.log("Inserting: " + data.body.name + " at " + i);
                            break;
                          }
                        }
                      },
                      function(err) {
                        console.error(err);
                      }
                    );

                } else {
                  //recURLs.push(song.preview_url);
                }
                //console.log("URLs: " + recNames);

                soundPlayer = new Howl({
                  src: [recURLs[0].preview],
                  format: ['mp3'],
                  autoplay: false,
                  volume: 0.3
                });
              });
            },
            function(err) {
              console.error(err);
            }
          );
        },
        function(err) {
          console.error(err);
        }
      );

      spotifyApi.getMyTopTracks({ limit: 10, time_range: 'short_term' }).then(
        function(data) {
          //console.log('Top Tracks', data.body.items);

          var topSongs = data.body.items;
          songList.style.visibility = 'visible';

          topSongs.forEach(function(song) {
            var node = document.createElement("li");
            //node.setAttribute("class", "list-group-item");
            node.className = "media mt-3";
            var textnode = document.createTextNode("" + song.name);
            var div = document.createElement("div");
            div.className = "media-body";
            div.appendChild(textnode);
            var imgnode = document.createElement("img");
            imgnode.className = "align-self-center mr-3";
            imgnode.setAttribute("id", "resize");
            imgnode.src = song.album.images[2].url;
            node.appendChild(imgnode);
            node.appendChild(div);
            //node.onclick = function() { viewArtist(Array.prototype.indexOf.call(songs.childNodes, node)); };
            songs.appendChild(node);

            songIDs.push(song.id);
          });
        },
        function(err) {
          console.error(err);
        }
      );

      var user;

      // Get the authenticated user
      spotifyApi.getMe()
        .then(function(data) {
          //console.log('Some information about the authenticated user', data.body);
          user = data.body.display_name;
          // Get a user's playlists
          spotifyApi.getUserPlaylists()
            .then(function(data) {
              //console.log('Retrieved playlists', data.body);
              var x = data.body.items;
              //console.log("X:" + x.name);
              x.forEach(function(pl) {
                //console.log(pl.name);
                //console.log(user);
                if(pl.owner.display_name === user) {
                  playlist.push(pl.name);
                  playlistIDs.push(pl.id);
                }
              });

              while (playlists.firstChild) {
                playlists.removeChild(playlists.firstChild);
              }
              playlist.forEach(function(name) {
                var node = document.createElement("li");
                var div = document.createElement("div");
                div.className = "form-check";
                node.className = "mt-3";
                var textnode = document.createTextNode("" + name);
                var radio = document.createElement("input");
                radio.className = "form-check-input";
                radio.type = "radio";
                radio.name = "action";
                div.appendChild(radio);
                div.appendChild(textnode);
                node.appendChild(div);
                playlists.appendChild(node);
              });
             console.log("Playlists: " + playlist);
            },function(err) {
              console.log('Something went wrong!', err);
            });
        }, function(err) {
          console.log('Something went wrong!', err);
        });

    },
    function(err) {
      console.log(
        'Something went wrong when retrieving the access token!',
        err.message
      );
    }
  );
  //
  //
  //   },
  //   function(err) {
  //     console.log(
  //       'Something went wrong when retrieving the access token!',
  //       err.message
  //     );
  //   }
  // );


  authWindow.close();
});

var uri;

function openModal(value) {
  uri = soundURIs[value];
  // while (playlists.firstChild) {
  //   playlists.removeChild(playlists.firstChild);
  // }
  // console.log("RAN1");
  //
  // playlist.forEach(function(name) {
  //   var node = document.createElement("li");
  //   var div = document.createElement("div");
  //   div.className = "form-check";
  //   node.className = "mt-3";
  //   var textnode = document.createTextNode("" + name);
  //   var radio = document.createElement("input");
  //   radio.className = "form-check-input";
  //   radio.type = "radio";
  //   radio.name = "action";
  //   div.appendChild(radio);
  //   div.appendChild(textnode);
  //   node.appendChild(div);
  //   playlists.appendChild(node);
  // });
  console.log("RAN2");
  $('#alert_placeholder').html('<div id = "alert_placeholder"></div>');
  $("#myModal").modal();
}


const save = document.getElementById("saveBtn");
save.addEventListener('click', function (event) {
  var playlistNumber = null;
  for (var i = 0; i < playlists.childNodes.length; i++) {
    if (playlists.childNodes[i].childNodes[0].childNodes[0].checked) {
      playlistNumber = i;
      break;
    }
  }

  if (playlistNumber === null) {
    $('#alert_placeholder').html('<div class="alert alert-danger alert-dismissible"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
                    '<strong>Error!</strong> Please select a playlist.</div>');
  } else {
    var id = playlistIDs[playlistNumber];
    // Add tracks to a playlist
    spotifyApi.addTracksToPlaylist(id, [uri])
      .then(function(data) {
        console.log('Added tracks to playlist!');
        $("#myModal").modal("toggle");
        $('#alert_placeholder2').html('<div class="alert alert-success alert-dismissible"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
                        '<strong>Success!</strong> Song added to playlist.</div>');
      }, function(err) {
        console.log('Something went wrong!', err);
      });
    //console.log(playlistNumber);
  }
});

var previousValue;
var timeoutID;

function playPreview(value) {
  // soundPlayer = new Audio(soundURLs[value]);
  // soundPlayer.play();
  //var timeoutID;
  if (!soundPlayer.playing()) {
    previousValue = value;
    soundPlayer = new Howl({
      src: [recURLs[value].preview],
      format: ['mp3'],
      autoplay: false,
      volume: 0.3,
    });
    soundPlayer.play();
    timeoutID = setTimeout(previewEnd, 30000, value);
    var node = recommended.childNodes[value];
    node.childNodes[2].src = "../assets/images/pause.png";
    console.log("Playing");
  } else {
    soundPlayer.stop();
    clearTimeout(timeoutID);
    console.log("Stopped");
    soundPlayer = new Howl({
      src: [recURLs[value].preview],
      format: ['mp3'],
      autoplay: false,
      volume: 0.3,
    });
    var node = recommended.childNodes[previousValue];
    node.childNodes[2].src = "../assets/images/play.png";
    if (previousValue !== value) {
      soundPlayer.play();
      timeoutID = setTimeout(previewEnd, 30000, value);
      var node = recommended.childNodes[value];
      node.childNodes[2].src = "../assets/images/pause.png";
      previousValue = value;
    }
  }
  //soundPlayer.on("end", previewEnd(value));
}

function previewEnd(value) {
  console.log("Ended");
  var node = recommended.childNodes[value];
  node.childNodes[2].src = "../assets/images/play.png";
}

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
        var node = document.createElement("li");
        node.className = "media mt-3";
        //node.setAttribute("id", "list-item");
        var textnode = document.createTextNode("" + artist.name);
        var div = document.createElement("div");
        div.className = "media-body";
        div.appendChild(textnode);
        textnode.onclick = "viewArtist(i)";
        var imgnode = document.createElement("img");
        imgnode.className = " align-self-center mr-3";
        imgnode.setAttribute("id", "resize");
        imgnode.src = artist.images[2].url;
        node.appendChild(imgnode);
        node.appendChild(div);
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
        var node = document.createElement("li");
        //node.setAttribute("class", "list-group-item");
        node.className = "media mt-3";
        var textnode = document.createTextNode("" + song.name);
        var div = document.createElement("div");
        div.className = "media-body";
        div.appendChild(textnode);
        var imgnode = document.createElement("img");
        imgnode.className = "align-self-center mr-3";
        imgnode.setAttribute("id", "resize");
        imgnode.src = song.album.images[2].url;
        node.appendChild(imgnode);
        node.appendChild(div);
        //node.onclick = function() { viewArtist(Array.prototype.indexOf.call(songs.childNodes, node)); };
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
