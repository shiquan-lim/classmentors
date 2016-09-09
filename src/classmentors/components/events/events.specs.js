import * as events from './events.js';

import {testInjectMatch} from 'classmentors/tools/chai.js';

describe('events component', function() {

  describe('eventServiceFactory', function() {

    testInjectMatch(events.eventServiceFactory);

  });

});
