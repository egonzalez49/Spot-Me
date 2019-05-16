const electron = require('electron')
const path = require('path')
const BrowserWindow = electron.remote.BrowserWindow

const name = document.getElementById('name')
const followers = document.getElementById('label')
const image = document.getElementById('photo')
const genreList = document.getElementById('genres')
const topTracks = document.getElementById('topTracks')
const myModal = document.getElementById('myModal')
const playlists = document.getElementById('playlists')

const axios = require('axios')
const superagent = require('superagent');
const express = require('express')
const app = express();
const ipc = electron.ipcRenderer
var {Howl, Howler} = require('howler')

var Promise = require('promise');
var SpotifyWebApi = require('spotify-web-api-node');

var soundPlayer;
var soundURLs = [];
var soundURIs = [];
var playlist = [];
var playlistIDs = [];

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

//Authentication Code
var code = null;
//Artist ID
var id = null;

window.addEventListener("load", function() {
  ipc.send("get-artist-id");
  //console.log("DONE!");
});

ipc.on('artist-id', function(event, arg1, arg2) {
  console.log(arg1);
  code = arg1;
  id = arg2;
  ipc.send("error-log", id);
  ipc.send("error-log", code);

  spotifyApi.setAccessToken(code);
  spotifyApi.getArtist(id).then(
    function(data) {
      console.log('Artist', data.body);
      var artist = data.body;

      name.innerHTML = "" + artist.name;
      followers.innerHTML = followers.innerHTML + " " + artist.followers.total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
      image.src = artist.images[2].url;
      var genres = artist.genres;
      genres.forEach(function(genre) {
        var node = document.createTextNode("" + genre);
        node.innerHTML = id +
        console.log(genre);
        genreList.insertAdjacentHTML('afterbegin', '<p class="badge badge-pill badge-success">' + genre + '</p>');
      });
    },
    function(err) {
      console.error(err);
    }
  );

  spotifyApi.getArtistTopTracks(id, 'US').then(
    function(data) {
      console.log('Top Tracks', data.body);
      var tracks = data.body.tracks;

      while (topTracks.firstChild) {
        topTracks.removeChild(topTracks.firstChild);
      }

      tracks.forEach(function(song) {
        //console.log(song.name);
        var node = document.createElement("li");
        node.className = "mt-3";
        var textnode = document.createTextNode("" + song.name);
        var imgnode = document.createElement("img");
        imgnode.src = song.album.images[2].url;
        imgnode.setAttribute("id", "photo2");

        var playnode = document.createElement("img");
        playnode.src = "../assets/images/play.png";
        playnode.setAttribute("id", "play");
        node.appendChild(imgnode);
        node.appendChild(textnode);
        node.appendChild(playnode);
        var savenode = document.createElement("img");
        savenode.src = "../assets/images/save.png";
        savenode.setAttribute("id", "play");
        savenode.onclick = function () { openModal(Array.prototype.indexOf.call(topTracks.childNodes, savenode.parentNode)); };
        node.appendChild(savenode);
        playnode.onclick = function() { playPreview(Array.prototype.indexOf.call(topTracks.childNodes, playnode.parentNode)); };
        topTracks.appendChild(node);
        //imgnode.onclick = function() { playPreview(topTracks.children.indexOf(imgnode.parentNode)); };
        soundURLs.push(song.preview_url);
        soundURIs.push(song.uri);
        //console.log(imgnode.parentNode);

        soundPlayer = new Howl({
          src: [soundURLs[0]],
          format: ['mp3'],
          autoplay: false,
          volume: 0.3
        });

        //songIDs.push(song.id);
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
      console.log('Some information about the authenticated user', data.body);
      user = data.body.display_name;
    }, function(err) {
      console.log('Something went wrong!', err);
    });

  // Get a user's playlists
  spotifyApi.getUserPlaylists()
    .then(function(data) {
      console.log('Retrieved playlists', data.body);
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
      //console.log("Playlists: " + playlist);
    },function(err) {
      console.log('Something went wrong!', err);
    });
});

var uri;

function openModal(value) {
  uri = soundURIs[value];
  while (playlists.firstChild) {
    playlists.removeChild(playlists.firstChild);
  }
  console.log("RAN1");

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
  console.log("RAN2");
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
    console.log(playlistNumber);
  }
});

var previousValue;

function playPreview(value) {
  // soundPlayer = new Audio(soundURLs[value]);
  // soundPlayer.play();
  var timeoutID;
  if (!soundPlayer.playing()) {
    previousValue = value;
    soundPlayer = new Howl({
      src: [soundURLs[value]],
      format: ['mp3'],
      autoplay: false,
      volume: 0.3,
    });
    soundPlayer.play();
    timeoutID = setTimeout(previewEnd, 30000, value);
    var node = topTracks.childNodes[value];
    node.childNodes[2].src = "../assets/images/pause.png";
    console.log("Playing");
  } else {
    soundPlayer.stop();
    clearTimeout(timeoutID);
    console.log("Stopped");
    soundPlayer = new Howl({
      src: [soundURLs[value]],
      format: ['mp3'],
      autoplay: false,
      volume: 0.3,
    });
    var node = topTracks.childNodes[previousValue];
    node.childNodes[2].src = "../assets/images/play.png";
    if (previousValue !== value) {
      soundPlayer.play();
      timeoutID = setTimeout(previewEnd, 30000, value);
      var node = topTracks.childNodes[value];
      node.childNodes[2].src = "../assets/images/pause.png";
      previousValue = value;
    }
  }
  //soundPlayer.on("end", previewEnd(value));
}

function previewEnd(value) {
  console.log("Ended");
  var node = topTracks.childNodes[value];
  node.childNodes[2].src = "../assets/images/play.png";
}
