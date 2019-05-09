const electron = require('electron')
const path = require('path')
const BrowserWindow = electron.remote.BrowserWindow

const name = document.getElementById('name')
const followers = document.getElementById('followers')
const image = document.getElementById('photo')
const genreList = document.getElementById('genres')
const topTracks = document.getElementById('topTracks')

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
      followers.innerHTML = "" + artist.followers.total;
      image.src = artist.images[2].url;
      var genres = artist.genres;
      genres.forEach(function(genre) {
        var node = document.createTextNode("" + genre);
        node.innerHTML = id +
        console.log(genre);
        genreList.insertAdjacentHTML('afterbegin', '<p>' + genre + '</p>');
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
        console.log(song.name);
        var node = document.createElement("li");
        var textnode = document.createTextNode("" + song.name);
        var imgnode = document.createElement("img");
        imgnode.src = song.album.images[2].url;
        var playnode = document.createElement("img");
        playnode.src = "../assets/images/play.png";
        node.appendChild(imgnode);
        node.appendChild(textnode);
        node.appendChild(playnode);
        node.onclick = function() { playPreview(Array.prototype.indexOf.call(topTracks.childNodes, node)); };
        topTracks.appendChild(node);
        soundURLs.push(song.preview_url);

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
