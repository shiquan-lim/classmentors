/**
 * classmentors/filters - shared filter factories.
 */

export function cmTruncateFilterFactory() {
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
cmTruncateFilterFactory.$inject = [];
