/**
 * singpath-core/services/datastore.js - singpath-core services accessing data
 * share between singpath and classmentors.
 *
 */
/* eslint no-underscore-dangle: ["error", { "allow": ["_user"] }]*/

export const gravatarBaseUrl = '//www.gravatar.com/avatar/';
export const eventName = 'spfCurrentUser.authChanged';

/**
 * Singleton holding the current user auth data and profile.
 *
 * The goal is deprecated spfAuthData and some app profile services, to replace
 * it with an easier API, which doesn't require angularFire.
 *
 * It should also ease keeping auth data and profile data in sync.
 *
 * TODO: add method to update the profile data.
 * TODO: add method to set and verify a security key.
 * TODO: add method to test a public id is available.
 *
 */
export class SpfCurrentUserService {

  constructor($q, $timeout, $log, $rootScope, spfCrypto, firebaseApp, authFirebaseApp, spfAuth, spfProfilesPath) {


    this.$q = $q;
    this.$timeout = $timeout;
    this.$log = $log;
    this.$rootScope = $rootScope;
    this.$db = firebaseApp.database();
    this.$authDb = authFirebaseApp.database();
    this.$spfAuth = spfAuth;
    this.$spfCrypto = spfCrypto;
    this.$spfProfilesPath = spfProfilesPath;
    this.$watchers = {};

    this.uid = null;
    this.firebaseUser = null;
    this.publicId = null;
    this.user = null;
    this.isAdmin = false;
    this.isPremium = false;
    this.profile = null;

    this.$watchers.firebaseUser = spfAuth.onAuth(
      firebaseUser => this.authChangedHandler(firebaseUser)
    );
  }

  /**
   * Return a promise resolving once the profile/auth data currently loading
   * finishes.
   *
   * Reject if the it times out (2000ms timeout delay by default).
   *
   * @param  {number} delay timeout delay
   * @return {Promise<void, Error>}
   */
  $loaded(delay) {
    const defaultTimeout = 2000;

    delay = isNaN(delay) ? defaultTimeout : delay;

    return this.$q((resolve, reject) => {
      const loaded = () => this.user !== undefined && this.profile !== undefined;

      if (loaded()) {
        resolve();
        return;
      }

      let timer;
      const stop = this.$rootScope.$on(eventName, () => {
        if (!loaded()) {
          return;
        }

        stop();
        resolve();
        this.$timeout.cancel(timer);
      });

      timer = this.$timeout(() => {
        stop();
        reject(new Error('timeout'));
      }, delay);
    });
  }

  /**
   * Stop watching user's data and profile and reset them.
   *
   * It should notify (event and digest trigger) the changed state.
   *
   * @param {any} value to set the value to null (loaded) instead indefined.
   */
  resetUser(value) {
    this.publicId = value !== undefined ? null : undefined;
    this.user = value !== undefined ? null : undefined;
    this.doResetProfile(value);

    if (this.$watchers.user) {
      this.$watchers.user();
      this.$watchers.user = undefined;
    }

    this.$rootScope.$emit(eventName, {user: true, profile: true});
    this.$rootScope.$applyAsync();
  }

  /**
   * Stop watching user's profile and reset it.
   *
   * It should notify (event and digest trigger) the changed state.
   *
   * @param {any} value to set the value to null (loaded) instead indefined.
   */
  resetProfile(value) {
    this.doResetProfile(value);
    this.$rootScope.$emit(eventName, {profile: true});
    this.$rootScope.$applyAsync();
  }

  doResetProfile(value) {
    this.profile = value !== undefined ? null : undefined;
    this.isAdmin = false;
    this.isPremium = false;

    if (this.$watchers.profile) {
      this.$watchers.profile();
      this.$watchers.profile = undefined;
    }
  }

  userRef(uid) {
    if (!uid) {
      throw new Error('The user uid provided.');
    }

    return this.$authDb.ref(`auth/users/${uid}`);
  }

  profileRef(publicId) {
    if (!publicId) {
      throw new Error('The user publicId provided.');
    }

    return this.$db.ref(`${this.$spfProfilesPath}/${publicId}`);
  }

  profileDetailsRef(publicId) {
    return this.profileRef(publicId).child('user');
  }

  /**
   * Set or update the saved user data at "auth/users/$userId".
   *
   * @return {Promise<void, Error>}
   */
  patchUser() {
    const ref = this.userRef(this.firebaseUser.uid);

    return ref.once('value').then(
      () => ref.transaction(value => this.updateUser(value))
    );
  }

  updateUser(user) {
    const info = this.info();

    if (!info) {
      return undefined;
    }

    if (!user) {
      return {
        id: this.firebaseUser.uid,
        fullName: info.name,
        displayName: info.name,
        email: info.email,
        gravatar: this.gravatar(info.email),
        createdAt: {'.sv': 'timestamp'}
      };
    }

    let updated = false;

    if (info.name !== user.fullName) {
      user.fullName = info.name;
      updated = true;
    }

    if (info.email !== user.email) {
      user.email = info.email;
      user.gravatar = this.gravatar(info.email);
      updated = true;
    }

    return updated ? user : undefined;
  }

  /**
   * Set or update the Profile data at "path/to/profile/$publicId/user".
   *
   * The path to app profile location is set via the "spfProfilesPath" angular
   * module constant.
   *
   * @return {Promise<void, Error>}
   */
  patchProfile() {
    const ref = this.profileDetailsRef(this.user.publicId);

    return ref.once('value').then(
      () => ref.transaction(value => this.updateProfile(value))
    );
  }

  updateProfile(profile) {
    if (!this.user || !this.user.displayName || !this.user.gravatar) {
      return undefined;
    }

    const newProfile = {
      displayName: this.user.displayName,
      gravatar: this.user.gravatar,
      yearOfBirth: this.user.yearOfBirth || null,
      school: this.user.school || null,
      country: this.user.country || null
    };

    if (!profile) {
      return newProfile;
    }

    const updatedProfile = Object.assign({}, profile, newProfile);

    let updated = Object.keys(updatedProfile).some(key => {
      const value = updatedProfile[key];
      const old = profile[key] || null;
      const isObject = value instanceof Object;

      if (!isObject) {
        return value !== old;
      }

      if (Boolean(value) !== Boolean(old)) {
        return true;
      }

      const propsChanged = Object.keys(value).some(
        p => value[p] !== old[p]
      );

      if (propsChanged) {
        return true;
      }

      const propsDeleted = Object.keys(old).some(
        p => !value[p]
      );

      return propsDeleted;
    });

    return updated ? Object.assign(profile, updatedProfile) : undefined;
  }

  /**
   * Handle changes to the current user auth status.
   *
   * It should update the firebaseUser and uid properties and notify (event and
   * digest trigger) the changed state.
   *
   * The changes should cascade to the auth and profile data, and the related
   * properties related.
   *
   * @param  {?{uid: string, provider: string, google: object}} firebaseUser firebase auth data
   */
  authChangedHandler(firebaseUser) {
    const isLogged = firebaseUser && firebaseUser.uid;
    const wasAlreadyLogged = (
      isLogged &&
      this.firebaseUser &&
      this.firebaseUser.uid &&
      this.firebaseUser.uid
    );

    this.uid = firebaseUser && firebaseUser.uid || null;
    this.firebaseUser = firebaseUser || null;

    if (!isLogged) {
      this.resetUser(null);
      this.$rootScope.$emit(eventName, {firebaseUser: true});
      return;
    }

    this.patchUser();

    if (!wasAlreadyLogged) {
      this.watchUser();
    }

    this.$rootScope.$emit(eventName, {firebaseUser: true});
    this.$rootScope.$applyAsync();
  }

  /**
   * Handle changes to the current user saved auth data.
   *
   * It should update the user and public properties and notify (event and
   * digest trigger) the changed state.
   *
   * The changes should cascade to the save profile data and to profile related
   * properties
   *
   * @param {?{publicId: string, displayName: string, gravatar: string}} user saved firebase auth data
   */
  userChangedHandler(user) {
    const dataSaved = user !== null;
    const newPublicId = (
      user &&
      user.publicId && (
        !this.user ||
        !this.user.publicId
      )
    );

    this.publicId = user && user.publicId || null;
    this.user = user;

    if (!dataSaved || !user.publicId) {
      this.resetProfile(null);
      this.$rootScope.$emit(eventName, {user: true});
      return;
    }

    this.patchProfile();

    if (!this.$watchers.profile || newPublicId) {
      this.watchProfile();
    }

    this.$rootScope.$emit(eventName, {user: true});
    this.$rootScope.$applyAsync();
  }

  /**
   * Handle changes to the current user saved auth data.
   *
   * update the profile. isAdmin and isPremium properties, and notify (event and
   * digest trigger) the changed state.
   *
   * @param  {?{isAdmin: boolean, isPremium: boolean}} profile profile data
   */
  profileChangedHandler(profile) {
    this.isAdmin = profile && profile.isAdmin || false;
    this.isPremium = profile && profile.isPremium || false;
    this.profile = profile;

    this.$rootScope.$emit(eventName, {profile: true});
    this.$rootScope.$applyAsync();
  }

  watchUser() {
    if (!this.firebaseUser || !this.firebaseUser.uid) {
      this.resetUser(null);
      return;
    }

    const ref = this.userRef(this.firebaseUser.uid);
    const handler = snapshot => this.userChangedHandler(snapshot.val());
    const onError = err => {
      this.$log.error(err);
      this.resetUser(null);
    };

    this.resetUser();
    this.$watchers.user = () => ref.off('value', handler);
    ref.on('value', handler, onError);
  }

  watchProfile() {
    if (!this.user || !this.user.publicId) {
      this.resetProfile(null);
      return;
    }

    const ref = this.profileDetailsRef(this.user.publicId);
    const handler = snapshot => this.profileChangedHandler(snapshot.val());
    const onError = err => {
      this.$log.error(err);
      this.resetProfile(null);
    };

    this.resetProfile();
    this.$watchers.profile = () => ref.off('value', handler);
    ref.on('value', handler, onError);
  }

  /**
   * Extract the current user name and email from the auth data.
   *
   * Only support google and custom provided data.
   *
   * @return {?{name: string, email: string}}
   */
  info() {
    if (!this.firebaseUser || !this.firebaseUser.provider) {
      return null;
    }

    if (this.firebaseUser.provider === 'google') {
      return {
        email: this.firebaseUser.google.email,
        name: this.firebaseUser.google.displayName
      };
    }

    if (this.firebaseUser.provider === 'custom') {
      return {
        email: 'custom@example.com',
        name: 'Custom User'
      };
    }

    throw new Error(`Wrong provider: ${this.firebaseUser.provider}`);
  }

  /**
   * Return the gravatar url for an email.
   *
   * @param  {string} email email to calculate gravatar url for.
   * @return {string}
   */
  gravatar(email) {
    return gravatarBaseUrl + this.$spfCrypto.md5(email);
  }

  /**
   * Register a handler for any changes to the current user authentication state
   *
   * @param  {function} handler function run for any changed state.
   * @return {function}         function to register the hanlder.
   */
  $watch(handler) {
    return this.$rootScope.$on(eventName, handler);
  }

  /**
   * Log user in.
   *
   * @return {Promise<void, Error>}
   */
  login() {
    return this.$spfAuth.login();
  }

  /**
   * Log user out.
   *
   * @return {void}
   */
  logout() {
    return this.$spfAuth.logout();
  }

  /**
   * Register user's public id and display name (optional).
   *
   * @param  {{publicId: string, displayName: string}} options user chosen public id and display name.
   * @return {Promise<void, Error>}
   */
  register(options) {
    return new Promise((resolve, reject) => {
      if (!this.uid) {
        reject(new Error('You are not logged and cannot register.'));
      }

      if (this.publicId) {
        reject(new Error(`you are already registered as "${this.publicId}"`));
      }

      const publicId = options && options.publicId;
      const displayName = options && options.displayName;

      if (!publicId) {
        reject(new Error('The public id was not provided.'));
      }

      const patch = {
        [`publicIds/${publicId}`]: this.uid,
        [`usedPublicIds/${publicId}`]: true,
        [`users/${this.uid}/publicId`]: publicId
      };

      if (displayName) {
        patch[`users/${this.uid}/displayName`] = displayName;
      }

      resolve(patch);
    }).then(patch => {
      var ref = this.$authDb.ref('auth');

      return ref.update(patch);
    });
  }

}

SpfCurrentUserService.$inject = [
  '$q',
  '$timeout',
  '$log',
  '$rootScope',
  'spfCrypto',
  'firebaseApp',
  'authFirebaseApp',
  'spfAuth',
  'spfProfilesPath'
];

/**
 * Returns an object with `user` (Firebase auth user data) property,
 * and login/logout methods.
 *
 * @param  {object}   $route           Angular router service.
 * @param  {object}   $log             Angular logging service.
 * @param  {object}   $firebaseAuth    Angularfire autentication service.
 * @param  {object}   authFirebaseApp  Firebase firebase app holding the authentication data.
 * @param  {object}   authProvider     Firebase auth provider
 * @return {{user: object, login: function, logout: function, onAuth: function}}
 */
export function spfAuthFactory($route, $log, $firebaseAuth, authFirebaseApp, authProvider) {
  var auth = $firebaseAuth(authFirebaseApp.auth());
  var cbs = [];
  var spfAuth = {

    // The current user auth data (null is not authenticated).
    user: auth.$getAuth(),

    /**
     * Get user info from current user provider data.
     *
     * @return {?{name: string, email: string}}
     */
    userInfo: function() {
      if (!spfAuth.user) {
        return null;
      }

      if (!spfAuth.user.providerData) {
        return {};
      }

      return spfAuth.user.providerData.reduce(function(merged, data) {
        switch (data.providerId) {
          case 'google.com':
            merged.email = data.email;
            merged.name = data.displayName;
            break;
          case 'custom':
            if (!merged.email) {
              merged.email = 'custom@example.com';
            }
            if (!merged.name) {
              merged.name = 'Custom User';
            }
            break;
          default:
            $log.error(`Wrong provider: ${spfAuth.user.providerId}`);
        }
        return merged;
      }, {});
    },

    /**
     * Start Oauth authentication dance against google oauth2 service.
     *
     * Updates spfAuth.user and return a promise resolving to the
     * current user auth data.
     *
     * @return {Promise<firebase.User, Error>}
     */
    login: function() {
      return auth.$signInWithPopup(authProvider).then(function(userCredentials) {
        spfAuth.user = userCredentials.user;

        return userCredentials.user;
      });
    },

    /**
     * Unauthenticate user and reset spfAuth.user.
     *
     * @return {Promise<void, Error>}
     */
    logout: function() {
      return auth.$signOut();
    },

    /**
     * Register a callback for the authentication event.
     *
     * @param  {function} fn  cb function for auth change events.
     * @param  {object}   ctx cb context.
     * @return {function} function to deregister handler
     */
    onAuth: function(fn, ctx) {
      const handler = {fn, ctx};

      cbs.push(handler);

      return () => {
        const index = cbs.indexOf(handler);

        if (index > -1) {
          cbs.splice(index, 1);
        }
      };
    }
  };

  auth.$onAuthStateChanged(function(currentAuth) {
    $log.debug('reloading');
    $route.reload();

    spfAuth.user = currentAuth || undefined;

    cbs.forEach(handler => {
      try {
        handler.fn.call(handler.ctx, currentAuth);
      } catch (e) {
        $log.error(e);
      }
    });
  });

  return spfAuth;
}

spfAuthFactory.$inject = [
  '$route',
  '$log',
  '$firebaseAuth',
  'authFirebaseApp',
  'authProvider'
];

/**
 * Service to interact with '/auth/users' singpath firebase db entry
 *
 * @param  {function} $q              Angular promise factory service.
 * @param  {object}   $log            Angular logging service.
 * @param  {object}   $firebaseObject AngularFire synchronized objects service.
 * @param  {object}   authFirebaseApp Firebase app hosting authentication data.
 * @param  {object}   spfAuth         singpath-core authentication service.
 * @param  {object}   spfCrypto       singpath-core crypto helpers service.
 * @return {{user: function, register: function, publicId: function, isPublicIdAvailable: function}}
 */
export function spfAuthDataFactory($q, $log, $firebaseObject, authFirebaseApp, spfAuth, spfCrypto) {
  var userDataPromise, spfAuthData;
  var db = authFirebaseApp.database();
  var UserFirebaseObject = $firebaseObject.$extend({
    $completed: function() {
      return Boolean(
        this.publicId &&
        this.country && (
          this.yearOfBirth ||
          this.country.code !== 'SG'
        ) && (
          this.school || (
            !this.yearOfBirth ||
            this.yearOfBirth < 1996 ||
            this.yearOfBirth > 2004
        ))
      );
    }
  });

  UserFirebaseObject.create = function(ref) {
    if (typeof ref.child !== 'function') {
      throw new Error(`A firebase Reference is required; received "${ref}".`);
    }

    return new spfAuthData.UserFirebaseObject(ref);
  };

  spfAuth.onAuth(function(auth) {
    if (!auth) {
      userDataPromise = undefined;
    }
  });

  spfAuthData = {
    UserFirebaseObject: UserFirebaseObject,

    _user: function() {
      var ref = db.ref(`auth/users/${spfAuth.user.uid}`);
      var syncObj = UserFirebaseObject.create(ref);

      return syncObj.$loaded().then(function() {
        return syncObj;
      });
    },

    /**
     * Returns a promise resolving to an angularFire $firebaseObject
     * for the current user data.
     *
     * The promise will be rejected if the is not authenticated.
     *
     * @return {Promise<object, Error>}
     */
    user: function() {
      if (!spfAuth.user || !spfAuth.user.uid) {
        return $q.reject(new Error('Your did not login or your session expired.'));
      }

      if (userDataPromise) {
        return userDataPromise;
      }

      userDataPromise = spfAuthData._user().then(
        spfAuthData.register
      );

      return userDataPromise;
    },

    /**
     * Setup initial data for the current user.
     *
     * Should run if 'auth.user().$value is `null`.
     *
     * Returns a promise resolving to the user data when
     * they become available.
     *
     * @param  {object} userDataObj user data to register.
     * @return {Promise<object, Error>}
     */
    register: function(userDataObj) {
      var userInfo;

      if (userDataObj == null) {
        return $q.reject(new Error('A user should be logged in to register'));
      }

      // $value will be undefined and not null when the userDataObj object
      // is set.
      if (userDataObj.$value !== null) {
        return $q.resolve(userDataObj);
      }

      userInfo = spfAuth.userInfo();

      if (!userInfo || !userInfo.name || !userInfo.email) {
        return $q.reject(new Error(
          `Failed to retrieve user data from provider data: ${JSON.stringify(spfAuth.user.providerData)}`
        ));
      }

      userDataObj.$value = {
        id: spfAuth.user.uid,
        fullName: userInfo.name,
        displayName: userInfo.name,
        email: userInfo.email,
        gravatar: gravatarBaseUrl + spfCrypto.md5(userInfo.email),
        createdAt: {'.sv': 'timestamp'}
      };

      return userDataObj.$save().then(function() {
        return userDataObj;
      });
    },

    /**
     * Set the user public id.
     *
     * @param  {object} userSync AngularFire object.
     * @return {Promise<void, Error>}
     */
    publicId: function(userSync) {
      if (!userSync || !userSync.publicId) {
        return $q.reject(new Error('The user has not set a user public id.'));
      }

      if (!userSync.$id) {
        return $q.reject(new Error('Expected an angularFire synchronized object.'));
      }

      var ref = db.ref('auth');
      var data = {
        [`publicIds/${userSync.publicId}`]: userSync.$id,
        [`usedPublicIds/${userSync.publicId}`]: true,
        [`users/${userSync.$id}/publicId`]: userSync.publicId
      };

      return ref.update(data).catch(function(err) {
        $log.info(err);
        return $q.reject(new Error('Failed to save public id. It might have already being used by an other user.'));
      });
    },

    /**
     * Test if a public id is available.
     *
     * @param  {string}  publicId id to test
     * @return {Promise<boolean, Error>}
     */
    isPublicIdAvailable: function(publicId) {
      var ref = db.ref(`auth/usedPublicIds/${publicId}`);

      return ref.once('value').then(function(snapshot) {
        return !snapshot.val();
      });
    }
  };

  return spfAuthData;
}

spfAuthDataFactory.$inject = [
  '$q',
  '$log',
  '$firebaseObject',
  'authFirebaseApp',
  'spfAuth',
  'spfCrypto'
];

/**
 * Create a function which when called return a promise resolving to the list of
 * Singapore schools.
 *
 * Load the list as soon as the the service is created. The service will return
 * the same promise over again as a way to cache the result.
 *
 * @param  {object}   $firebaseObject AngularFire synchronized objects service.
 * @param  {object}   firebaseApp     Firebase app hosting the app data.
 * @return {function}
 */
export function spfSchoolsFactory($firebaseObject, firebaseApp) {
  var db = firebaseApp.database();
  var ref = db.ref('classMentors/schools');
  var syncObj = $firebaseObject(ref);
  var promise = syncObj.$loaded().then(function() {
    return syncObj;
  });

  /**
   * Resolve to the list of schools as an angularFire synchronized object.
   *
   * @return {Promise<object, Error>}
   */
  return function spfSchools() {
    return promise;
  };
}

spfSchoolsFactory.$inject = ['$firebaseObject', 'firebaseApp'];

export function run($log, spfProfilesPath) {
  if (!spfProfilesPath) {
    throw new Error(
      'spfProfilesPath constant is not set\n' +
      '(set it with e.g. ' +
      '"myModule.constant(\`spfProfilesPath\`, \'classMentors/userProfiles\');"' +
      ')'
    );
  }

  $log.info(`spfProfilesPath set to "${spfProfilesPath}".`);
}

run.$inject = ['$log', 'spfProfilesPath'];
