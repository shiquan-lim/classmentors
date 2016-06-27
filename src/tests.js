(function() {
  'use strict';
  describe('Configuration', function() {
    it('should run a simple test', function() {
      //Uncommenting expect will cause an error.
      //expect(1).toBe(1);
    });
  });
})();
import * as chai from 'chai';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import 'classmentors/components/classmentors/classmentors.specs.js';
import 'classmentors/components/ace/ace.specs.js';
