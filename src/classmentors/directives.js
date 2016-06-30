'use strict';

import module from 'classmentors/module.js';

/**
 * Validate that an input value contains a pattern.
 *
 * TODO: replace with ngPattern?
 */
module.directive('cmContains', [
  function cmContainsFactory() {
    return {
      restrict: 'A',
      scope: false,
      require: 'ngModel',
      link: function cmContainsPostLink(scope, e, attr, model) {
        var pattern = scope.$eval(attr.cmContains);

        scope.$watch(attr.cmContains, function(value) {
          pattern = value;
        });

        model.$validators.cmContains = function(modelValue, viewValue) {
          return viewValue && viewValue.indexOf(pattern) !== -1;
        };
      }
    };
  }
]);
