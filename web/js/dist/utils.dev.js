"use strict";

function check_arg() {
  var target = arguments[0];

  for (var i = 1; i < arguments.length; i++) {
    if (target.search(arguments[i]) >= 0) return arguments[i];
  }

  return undefined;
}

function search(val, src, l, r) {
  if (r == undefined) {
    l = 0;
    r = src.length;
  }

  var pivot = l + r >> 1;
  if (l >= r || pivot == l || pivot == r) return pivot;
  var in_between = (pivot <= 0 || src[pivot - 1] <= val) && val <= src[pivot];
  if (in_between) if (src[pivot] == val) return pivot;else if (src[pivot - 1] == val) return pivot - 1;else return pivot;
  if (src[pivot] < val) return search(val, src, pivot, r);else return search(val, src, l, pivot);
}

function convertFromTimestamp(timestamp) {
  // this will covert LRC timestamp to seconds
  try {
    var mm = timestamp.split(':')[0];
    var ss = timestamp.split(':')[1];
    var xx = ss.split('.')[1];
    ss = ss.split('.')[0];
    return mm * 60 + ss * 1 + xx * Math.pow(0.1, xx.length);
  } catch (error) {
    console.error(error);
    return 0;
  }
}

function parseLryics(lrcs) {
  var lrc_regex = /^(?:\[)(.*)(?:\])(.*)/gm;
  var lyrics = {};
  var arg; // stub for babel

  function addMatches(lrc_string) {
    var match;

    while ((match = lrc_regex.exec(lrc_string)) !== null) {
      if (match.index === lrc_regex.lastIndex) lrc_regex.lastIndex++; // This is necessary to avoid infinite loops with zero-width matches

      var timestamp = match[1];
      if (timestamp.indexOf('.') == -1) timestamp += '.000'; // Pad with 0ms if no milliseconds is defined

      timestamp = convertFromTimestamp(timestamp);

      if (!lyrics[timestamp.toString()]) {
        lyrics[timestamp.toString()] = [match[2]];
      } else {
        lyrics[timestamp.toString()].push(match[2]);
      }
    }
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = arguments[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var lrc = _step.value;
      addMatches(lrc);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return lyrics;
}