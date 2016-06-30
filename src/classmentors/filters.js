'use strict';

import module from 'classmentors/module.js';

module.filter('cmTruncate', [
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
