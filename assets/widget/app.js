var convertTime = function (unixtime) {
  var date = new Date(unixtime);
  var minutes = "0" + date.getMinutes();
  var seconds = "0" + date.getSeconds();
  return minutes.substr(minutes.length-2) + ':' + seconds.substr(seconds.length-2);
};

(function() {
  var canvas = document.getElementById('waveform');
  var play = document.getElementById('play');
  var pause = document.getElementById('pause');
  var position = document.getElementById('position');
  var progress = 0;
  var isPlaying = false;

  var render = function (offsetX) {
    var waveform = new Waveform();
    var data;
    // Trim trailing comma if we are a string
    waveform.ctx = canvas.getContext('2d');
    waveform.width = document.getElementById('container').offsetWidth;
    waveform.height = 97;
    waveform.offsetX = offsetX;
    waveform.progress = progress;
    waveform.update(waveData);
  };

  var whenPause = function () {
    isPlaying = false;
    pause.style.display = 'none';
    play.style.display = 'block';
  };

  var whenPlay = function () {
    isPlaying = true;
    pause.style.display = 'block';
    play.style.display = 'none';
  };

  soundManager.setup({
    useHTML5Audio: true,
    defaultOptions: {
      volume: 100,
      whileplaying: function() {
        //position.innerHTML = convertTime(Math.floor(this.position));
        progress = ((this.position / this.duration) * 100);
        render();
      },
      onfinish: whenPause,
      onpause: whenPause,
      onplay: whenPlay,
      onresume: whenPlay
    }
  });

  canvas.onmousemove = function(event){
    if (isPlaying) render(event.offsetX || event.layerX);
  };
  canvas.onmouseleave = function () {
    render(false);
  };
  canvas.onmousedown = function (event) {
    var sound = soundManager.getSoundById(trackId);
    if(!trackId) return false;

    var x = event.offsetX || event.layerX,
      width = event.target.clientWidth,
      duration = sound.durationEstimate;
    sound.setPosition((x / width) * duration);
  };

  play.onclick = function () {
    soundManager.createSound({
      id: trackId,
      url: trackOgg
    });
    soundManager.play(trackId);
    return false;
  };

  pause.onclick = function () {
    soundManager.pause(trackId);
    return false;
  };

  render();


})();