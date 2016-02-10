'use strict';

var appFilters = angular.module('appFilters', []);

appFilters.filter('kNumber', function () {
  return function (val) {
    if((typeof val == 'number') && (val > 1000)) {
      val = Math.round(val / 1000);
      val += 'k';
    }
    return val;
  };
});

appFilters.filter('minutesDuration', function () {
  return function (value) {
    if (typeof value === 'undefined' || value === null) {
      return '';
    }
    value = Math.round(value/60);
    return value;
  };
});

appFilters.filter('trackDuration', ['moment', function (moment) {
  return function (value, format, suffix) {
    if (typeof value === 'undefined' || value === null) {
      return '';
    }
    var seconds = moment.duration(value, 'seconds').seconds().toString();
    var minutes = moment.duration(value, 'seconds').minutes().toString();
    seconds = (seconds.length == 1) ? '0' + seconds : seconds;
    minutes = (minutes.length == 1) ? '0' + minutes : minutes;

    return minutes + ':' + seconds;
  };
}]);