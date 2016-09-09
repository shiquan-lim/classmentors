import countries from 'singpath-core/services/countries.js';
import * as icons from 'singpath-core/services/icons/icons.js';
import * as crypto from 'singpath-core/services/crypto.js';
import * as routeServices from 'singpath-core/services/routes.js';
import * as datastore from 'singpath-core/services/datastore.js';
import {run as firebaseRun} from 'singpath-core/services/firebase.js';

const services = {
  countries,
  icons,
  crypto,
  routes: routeServices,
  datastore,
  firebase: {run: firebaseRun}
};

export default services;
