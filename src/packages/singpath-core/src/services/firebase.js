/**
 * singpath-core/services/firebase.js - helpers for firebase operation.
 */

/**
 * Check the firebase app references are set.
 *
 * @param {object}                     $log            Angular logger service
 * @param {firebase.app.App}           firebaseApp     Main firebase app
 * @param {firebase.app.App}           authFirebaseApp Firebase app handling authentication.
 * @param {firebase.auth.AuthProvider} authProvider    Firebase app auth provider.
 */
export function run($log, firebaseApp, authFirebaseApp, authProvider) {
  if (!firebaseApp || !authFirebaseApp) {
    throw new Error('Firebase Apps (main and auth) are not set.');
  }

  if (!authProvider) {
    throw new Error('Firebase auth provider is not set.');
  }

  $log.info(`Auth Firebase app: ${authFirebaseApp.options.authDomain}`);
  $log.info(`Main Firebase app: ${firebaseApp.options.authDomain}`);
}
run.$inject = ['$log', 'firebaseApp', 'authFirebaseApp', 'authProvider'];

const invalidChar = ['.', '#', '$', '/', '[', ']'];

/**
 * Remove invalid items from an object.
 *
 * Invalid items have a key with an invalid char:
 * '.', '#', '$', '/', '[' or ']'.
 *
 * @param  {any} obj value to cleanup.
 * @return {any}
 */
export function cleanObj(obj) {
  if (obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(x => cleanObj(x));
  }

  if (
    obj == null ||
    !(obj instanceof Object) ||
    typeof obj.getDate === 'function'
  ) {
    return obj;
  }

  return Object.keys(obj).reduce(function(copy, key) {
    for (var i = 0; i < invalidChar.length; i++) {
      if (key.indexOf(invalidChar[i]) !== -1) {
        return copy;
      }
    }

    copy[key] = cleanObj(obj[key]);

    return copy;
  }, {});
}
