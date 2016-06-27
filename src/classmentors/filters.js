'use strict';

import {classMentors} from './module.js';

classMentors.filter('cmTruncate', [
  function cmTruncateFilter() {
    return function cmTruncate(s, limit) {
      if (!s || !s.length || !limit) {
        return '';
      }

      if (s.length <= limit) {
        return s;
      }

      return `${s.slice(0, limit)}...`;
    };
  }
]);
