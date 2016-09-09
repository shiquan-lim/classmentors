import * as services from './services.js';

import {testInjectMatch} from 'classmentors/tools/chai.js';

describe('services', function() {

  describe('clmService', function() {

    testInjectMatch(services.clmServiceFactory);

  });

  describe('clmDataStore', function() {

    testInjectMatch(services.clmDataStoreFactory);

  });

});
