import * as chai from 'chai';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

// include everything for coverage
import 'classmentors/services.js';
import 'classmentors/filters.js';
import 'classmentors/directives.js';
import 'classmentors/components/index.js';

import 'classmentors/components/index.specs.js';
