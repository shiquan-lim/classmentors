import * as challenges from './challenges.js';

import {testInjectMatch} from 'classmentors/tools/chai.js';

describe('challenges component', function() {

  describe('challengeServiceFactory', function() {

    testInjectMatch(challenges.challengeServiceFactory);

  });

});
