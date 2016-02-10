var Waveform = function () {
      // Private properties and methods
      var that = this;
      var startArr;
      var endArr;
      var looping = false;

      // Loop method adjusts the height of bar and redraws if neccessary
      var loop = function() {
        var delta;
        var animationComplete = true;

        // Boolean to prevent update function from looping if already looping
        looping = true;

        // For each bar
        for (var i = 0; i < endArr.length; i++) {
          // Change the current bar height toward its target height
          delta = (endArr[i] - startArr[i]) / that.animationSteps;
          that.curArr[i] += delta;
          // If any change is made then flip a switch
          if (delta) {
            animationComplete = false;
          }
        }

        // If no change was made to any bars then we are done
        if (animationComplete) {
          looping = false;
        } else {
          // Draw and call loop again
          draw(that.curArr);
          setTimeout(loop, that.animationInterval / that.animationSteps);
        }
      }; // End loop function

      // Draw method updates the canvas with the current display
      var draw = function(arr) {
        var numOfBars = arr.length;
        var barWidth;
        var barHeight;
        var ratio;
        var maxBarHeight;
        var gradient;
        var gradientOnMove;
        var largestValue = 0;
        var graphAreaX = 0;
        var graphAreaY = 0;
        var graphAreaWidth = that.width;
        var graphAreaHeight = that.height;
        var i;
        var selectedBar;
        var nowPlayingBar = 0;

        that.ctx.clearRect(0, 0, that.width, that.height);

        // Update the dimensions of the canvas only if they have changed
        if (that.ctx.canvas.width !== that.width || that.ctx.canvas.height !== that.height) {
          that.ctx.canvas.width = that.width;
          that.ctx.canvas.height = that.height;
        }

        // Draw the background color
        that.ctx.fillStyle = that.backgroundColor;
        that.ctx.fillRect(0, 0, that.width, that.height);

        // If x axis labels exist then make room
        if (that.xAxisLabelArr.length) {
          graphAreaHeight -= 40;
        }

        // Calculate dimensions of the bar
        barWidth = graphAreaWidth / numOfBars - that.margin * 2;
        maxBarHeight = graphAreaHeight;

        // Determine the largest value in the bar array
        for (i = 0; i < arr.length; i++) {
          if (arr[i] > largestValue) {
            largestValue = arr[i];
          }
        }

        // If detected mouse move event
        if (that.offsetX) {
          selectedBar = Math.round(that.offsetX / (barWidth + that.margin * 2));
        }

        if (that.progress) {
          nowPlayingBar = Math.round(numOfBars / 100 * that.progress);
        }

        // For each bar
        for (i = 0; i < arr.length; i++) {
          // Set the ratio of current bar compared to the maximum
          if (that.maxValue) {
            ratio = arr[i] / that.maxValue;
          } else {
            ratio = arr[i] / largestValue;
          }

          barHeight = ratio * maxBarHeight;

          // Draw bar background
          var color = "#6C7176";
          if (i < nowPlayingBar && that.progress != 0)
            color = "#DC73AC";
          if (i <= selectedBar)
            color = "#fff";
          that.ctx.fillStyle = color;
          that.ctx.fillRect(
            that.margin + i * that.width / numOfBars,
            graphAreaHeight - barHeight,
            barWidth,
            barHeight
          );
        }
      }; // End draw method

      // Public properties and methods
      this.ctx = '';
      this.progress = 0;
      this.width = 900;
      this.height = 97;
      this.maxValue = 0;
      this.margin = 1;
      this.colors = ["purple", "red", "green", "yellow"];
      this.curArr = [];
      this.backgroundColor = "rgba(0, 0, 0, 0)";
      this.xAxisLabelArr = [];
      this.yAxisLabelArr = [];
      this.animationInterval = 100;
      this.animationSteps = 10;
      this.offsetX = 0;

      // Update method sets the end bar array and starts the animation
      this.update = function(newArr) {
        // If length of target and current array is different
        if (newArr) {
          if (that.curArr.length !== newArr.length) {
            that.curArr = newArr;
            draw(newArr);
          } else {
            // Set the starting array to the current array
            startArr = that.curArr;
            // Set the target array to the new array
            endArr = newArr;
            // Animate from the start array to the end array
            if (!looping) {
              loop();
            }
          }
        }
      }; // End update method
};