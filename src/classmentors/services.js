/**
 * classmentors/services.js
 */
/* eslint no-underscore-dangle: "off" */
import {cleanObj} from 'singpath-core/services/firebase.js';
import camelCase from 'lodash.camelcase';

const noop = () => undefined;

function loaded(syncObjOrArray) {
  return syncObjOrArray.$loaded().then(() => syncObjOrArray);
}

/**
 * Singleton third party services list factory.
 *
 * @example
 * module.run(['clmServices', function() {
 *   clmServices.register('codeCombat');
 * }]);
 * module.component('someComponent', {
 *   template: '...',
 *   controller: [
 *     '$firebaseObject',
 *     'clmServices',
 *     'spfCurrentUser',
 *     function($firebaseObject. clmServices, spfCurrentUser) {
 *       this.data = $firebaseObject(clmServices.codeCombat.dataRef(spfCurrentUser.publicId));
 *   }]
 * });
 *
 * @param  {object}   $firebaseObject AngularFire sync object service.
 * @param  {object}   $log            Angular logging service.
 * @param  {function} $q              Angular Promise factory service.
 * @param  {function} $timeout        Angular timeout service.
 * @param  {object}   firebaseApp     Class Mentors main firebase App
 * @return {object}
 */
export function clmServicesFactory($firebaseObject, $log, $q, $timeout, firebaseApp) {
  const availableBadgesPromise = {};
  const db = firebaseApp.database();

  /**
   * Basic third party service handler
   */
  class GenericService {

    /**
     * GenericService constructor.
     * @param  {string} name        Service name.
     * @param  {string} [id]        Service id
     * @param  {string} [settingId] Id of the setting enabling this service.
     */
    constructor(name, id, settingId) {

      /**
       * The service name.
       * @type {string}
       */
      this.name = name;

      /**
       * The Service id.
       * @type {string}
       */
      this.serviceId = id || camelCase(name);

      /**
       * The setting enabling this service.
       * @type {string}
       */
      this.settingId = settingId || camelCase(`enable ${name}`);

    }

    /* deprecated methods */

    badges() {
      $log.warn(new Error('deprecated'));
      return {};
    }

    fetchProfile() {
      $log.warn(new Error('deprecated'));
      return $q.resolve({});
    }

    fetchBadges() {
      $log.warn(new Error('deprecated'));
      return $q.resolve([]);
    }

    updateProfile() {
      $log.warn(new Error('deprecated'));
      return $q.resolve();
    }

    /**
     * Return a promise resolving to all avalaible badges at
     * that service.
     *
     * @todo replaced by `availableAchievement`.
     * @return {FirebaseObject} the list of badge for a service.
     */
    availableBadges() {

      if (availableBadgesPromise[this.serviceId]) {
        return availableBadgesPromise[this.serviceId];
      }

      const ref = db.ref(`classMentors/badges/${this.serviceId}`);
      const badges = $firebaseObject(ref);

      availableBadgesPromise[this.serviceId] = loaded(badges);

      return availableBadgesPromise[this.serviceId];
    }

    /**
     * Return a firebase Reference to the user service data (for that service).
     *
     * @param  {string} publicId The user publicId
     * @return {firebase.database.Reference}
     */
    dataRef(publicId) {
      return db.ref(`classMentors/userProfiles/${publicId}/services/${this.serviceId}`);
    }

    /**
     * Return the user data for that service.
     *
     * It will return undefined if the details are for that service are
     * not set or if the user id is missing.
     *
     * @param {firebaseObj} profile Class Mentor profile of a user
     * @return {?{details: object, lastUpdate: number, lastUpdateRequest: number}}
     */
    data(profile) {
      if (
        profile &&
        profile.services &&
        profile.services[this.serviceId] &&
        profile.services[this.serviceId].details &&
        profile.services[this.serviceId].details.id
      ) {
        return profile.services[this.serviceId];
      }

      return undefined;
    }

    /**
     * Return the user details for that service.
     *
     * It will return undefined if the details are for that service are
     * not set or if the user id is missing.
     *
     * @param {FirebaseObject} profile Class Mentor profile of a user.
     * @return {?{id: string, name: string, registeredBefore: number}}
     */
    details(profile) {
      const data = this.data(profile);

      return data && data.details;
    }

    /**
     * Resolve when the user can request an update for this service.
     *
     * Reject if the user not registered.
     *
     * @param {{lastUpdateRequest: ?number}} serviceData Class Mentor profile of a user.
     * @return {{value: boolean, timeout: Promise<void,Error>, cancel: function(): void}}
     */
    canRequestUpdate(serviceData) {
      const result = (delay) => {
        const value = !delay;
        const timeout = value ? Promise.resolve() : $timeout(undefined, delay);
        const cancel = value ? noop : (() => $timeout.cancel(timeout));

        return {value, timeout, cancel};
      };

      if (!serviceData) {
        throw new Error('no service data');
      }

      if (!serviceData.lastUpdateRequest) {
        return result();
      }

      const delta = this.now() - serviceData.lastUpdateRequest;
      const maxDelta = 60000;

      if (delta >= maxDelta) {
        return result();
      }

      return result(maxDelta - delta);
    }

    /**
     * Return the current timestamps
     * @return {number}
     * @private
     */
    now() {
      return new Date().getTime();
    }

    /**
     * It should create the user details for that service and request an update.
     *
     * @param  {string}                     publicId User's publiId.
     * @param  {{id: string, name: string}} details  Holds the user id and user name for that service
     * @return {Promise<void,Error>}
     */
    saveDetails(publicId, details) {
      if (!publicId) {
        return $q.reject(new Error('No public id provided..'));
      }

      if (!details || !details.id) {
        return $q.reject(new Error(
          `The user details for ${this.serviceId} should include an id.`
        ));
      }

      const ref = db.ref(`classMentors/userProfiles/${publicId}/services/${this.serviceId}/details`);

      return ref.set(Object.assign(
        {registeredBefore: {'.sv': 'timestamp'}},
        cleanObj(details)
      )).then(
        () => this.requestUpdate(publicId).catch(err => $log.error(err))
      );
    }

    /**
     * Remove the service data.
     *
     * @param  {string}  publicId User's publiId.
     * @return {Promise<void,Error>}
     */
    removeDetails(publicId) {
      if (!publicId) {
        return $q.reject(new Error('No public id provided.'));
      }

      const ref = db.ref(`classMentors/userProfiles/${publicId}/services/${this.serviceId}`);

      return ref.remove();
    }

    /**
     * Request the profile for that service to be updated.
     *
     * @param  {string} publicId The user public id.
     * @return {Promise<void,Error>}
     */
    requestUpdate(publicId) {
      if (!publicId) {
        return $q.reject(new Error('No public id provided.'));
      }

      const rootRef = db.ref('/');
      const taskKey = db.ref('queue/tasks').push().key;
      const servicePath = `classMentors/userProfiles/${publicId}/services/${this.serviceId}`;

      return rootRef.update({
        [`queue/tasks/${taskKey}`]: {id: publicId, service: this.serviceId},
        [`${servicePath}/lastUpdateRequest`]: {'.sv': 'timestamp'}
      });
    }

  }

  /**
   * List of third party services providing user achiements.
   */
  class Services {

    /**
     * Service list contructor.
     *
     * Iteration other the Services object should only return service id.
     */
    constructor() {

      /**
       * List of enabled services.
       * @type {Array}
       */
      Object.defineProperty(this, '$enabledServices', {value: [], writable: true});

      /**
       * List of settings
       * @type {Object}
       */
      Object.defineProperty(this, '$settings', {value: {}, writable: true});

    }

    /**
     * Register a new third party service.
     *
     * Adds the service as clmServices propertty (using the serviceId as the key).
     *
     * @param  {string} serviceName Service name.
     * @param  {string} [serviceId] Service id - default to the service name in camel case.
     * @param  {string} [settingId] Id of the setting enabling the service.
     * @return {GenericService}
     */
    register(serviceName, serviceId, settingId) {
      const service = new GenericService(serviceName, serviceId, settingId);

      this[service.serviceId] = service;
      this.doEnableServices();

      return service;
    }

    /**
     * Handler for setting changes.
     *
     * Should update the list of enabled services.
     *
     * @param  {object} settings List of Class Mentors settings.
     * @private
     */
    enableServices(settings) {
      this.$settings = settings || {};
      this.doEnableServices();
    }

    /**
     * Update the list enabled services.
     *
     * @private
     */
    doEnableServices() {
      const ids = Object.keys(this);

      this.$enabledServices = ids.filter(serviceId => {
        const settingId = this[serviceId].settingId;

        return this.$settings[settingId] && this.$settings[settingId].value;
      });
    }

    /**
     * List available services.
     *
     * @return {object}
     */
    available() {
      return this.$enabledServices.map(serviceId => this[serviceId]);
    }

    /**
     * List available and setup services for a profile.
     *
     * @param  {object} profile AngularFire sync object representing a user object.
     * @return {object}
     */
    registeredWith(profile) {
      return this.available().filter(service => {
        const details = service.details(profile);

        return details !== undefined;
      });
    }

    /**
     * Return a promise which resolve when the profile can request a refresh
     * of at least some of the services.
     *
     * The rate limit for an update is once per minute.
     *
     * @param  {object} profile AngularFire sync object representing a user object.
     * @return {Promise<void,Error>}
     */
    canRefresh(profile) {
      const timers = this.registeredWith(profile).map(
        service => service.canRequestUpdate(service.data(profile)).timeout
      );
      const cancel = () => timers.forEach(t => $timeout.cancel(t));

      if (timers.length === 0) {
        return $q.resolve();
      }

      return $q.race(timers).then(
        () => cancel(),
        err => {
          cancel();

          return $q.reject(err);
        }
      );
    }

    /**
     * Refresh profile service details.
     *
     * Service refreshed too recently will be skipped.
     *
     * @param  {object} profile AngularFire sync object representing a user object.
     * @return {Promise<void,Error>}
     */
    refresh(profile) {
      const requests = this.registeredWith(profile).map(
        service => service.requestUpdate(profile.$id)
      );

      return $q.all(requests);
    }

    /**
     * Return a database reference to the user service data.
     *
     * @param  {string} publicId [description]
     * @return {firebase.database.Reference}
     */
    ref(publicId) {
      if (!publicId) {
        throw new Error('Note public id provided.');
      }

      return db.ref(`classMentors/userProfiles/${publicId}/services`);
    }

  }

  const services = new Services();
  const settingsRef = db.ref('classMentors/settings');

  // watch for setting update enabling/disabling service.
  settingsRef.on(
    'value',
    snapshot => services.enableServices(snapshot.val()),
    err => {
      $log.error(err);
      services.enableServices();
    }
  );

  return services;
}

clmServicesFactory.$inject = ['$firebaseObject', '$log', '$q', '$timeout', 'firebaseApp'];

/**
 * Service to interact with singpath firebase db
 *
 */
export function clmDataStoreFactory(
  $window, $location, $q, $log, $http, $timeout,
  firebaseApp, $firebaseObject, $firebaseArray, spfSchools,
  routes, spfAuth, spfAuthData, spfCrypto, clmServices, clmServicesUrl
) {
  var clmDataStore;
  var db = firebaseApp.database();
  var ProfileFirebaseObject = $firebaseObject.$extend({
    canView: function(obj) {
      var kind = obj && obj.$ref && obj.$ref().parent.path.toString();

      // if (this.user && this.user.isAdmin) {
      //   return true;
      // }

      if (obj.owner && obj.owner.publicId && this.$id === obj.owner.publicId) {
        return true;
      }

      if (obj.assistants && obj.assistants[this.$id]) {

          // $log.info(obj.assistants );
        return true;
      }

      if (
        kind === '/classMentors/events' &&
        obj.$id &&
        this.joinedEvents &&
        this.joinedEvents[obj.$id]
      ) {
        return true;
      }

      return false;
    }
  });

  ProfileFirebaseObject.create = function(publicId) {
    var ref = db.ref(`classMentors/userProfiles/${publicId}`);

    return new ProfileFirebaseObject(ref);
  };

  var ParticipantsFirebaseArray = $firebaseArray.$extend({
    $schools: function() {
      return this.$list.reduce(function(schools, participant) {
        if (
          !participant.user ||
          !participant.user.school ||
          !participant.user.school.name
        ) {
          return schools;
        }

        schools[participant.user.school.name] = participant.user.school;

        return schools;
      }, {});
    }
  });

  ParticipantsFirebaseArray.create = function(eventId) {
    var ref = db.ref(`classMentors/eventParticipants/${eventId}`);

    return new ParticipantsFirebaseArray(ref);
  };

  clmDataStore = {

    ProfileFirebaseObject,

    /**
     * Return a promise resolving to $firebaseObj pointing to
     * the current user profile for Classmemtors.
     *
     * If the user has a classmemtor profile and its user data are outdated.
     * they will get updated.
     *
     */
    currentUserProfile: function() {
      var currentUserPromise = spfAuthData.user();
      var profilePromise = spfAuthData.user().then(function(currentUser) {
        if (!currentUser.publicId) {
          return undefined;
        }

        return clmDataStore.profile(currentUser.publicId);
      });

      return $q.all({
        currentUser: currentUserPromise,
        profile: profilePromise
      }).then(function(resp) {
        var userData = resp.profile && resp.profile.user;

        if (!userData) {
          return resp.profile;
        }

        var userCountry = userData.country && userData.country.code;
        var profileCountry = resp.currentUser.country && resp.currentUser.country.code;

        if (
          userData.displayName === resp.currentUser.displayName &&
          userData.gravatar === resp.currentUser.gravatar &&
          userCountry === profileCountry &&
          userData.yearOfBirth === resp.currentUser.yearOfBirth
        ) {
          return resp.profile;
        }

        return clmDataStore.updateProfile(resp.currentUser);
      });
    },

    logging: {
      inputLog: function(actionObj) {
        var ref = db.ref('classMentors/userActions');

        return ref.push(actionObj);
      }
    },

    profile: function(publicId) {
      return $q.resolve(publicId).then(function(id) {
        return loaded(clmDataStore.ProfileFirebaseObject.create(id));
      });
    },

    getProfileData: function(publicId) {
      var ref = db.ref(`classMentors/userProfiles/${publicId}/user`);

      return loaded($firebaseObject(ref));
    },

    updateProfile: function(userData) {
      var ref = db.ref(`classMentors/userProfiles/${userData.publicId}/user`);

      return ref.update({
        displayName: userData.displayName,
        gravatar: userData.gravatar,

        // cleanup optional values
        country: cleanObj(userData.country),
        yearOfBirth: cleanObj(userData.yearOfBirth),
        school: cleanObj(userData.school)
      }).then(function() {
        return clmDataStore.profile(userData.publicId);
      });
    },

    getSchools: function() {
      return spfSchools();
    },

    initProfile: function() {
      return spfAuthData.user().then(function(currentUser) {
        if (!currentUser || !currentUser.publicId) {
          return $q.reject(new Error('The user has not set a user public id.'));
        }

        return clmDataStore.updateProfile(currentUser);
      });
    },

    cohorts: {
      errNoPublicId: new Error('You should have a public id to join a cohort'),

      create: function(cohort) {
        var rootRef = db.ref('classMentors/cohorts');
        var publicId = cohort.owner.publicId;
        var ref = rootRef.push(cohort);

        return ref.then(function() {
          return ref.once('value');
        }).then(function(snapshot) {
          var val = snapshot.val();
          var profileRef = db.ref(`classMentors/userProfiles/${publicId}/createdCohorts/${snapshot.key}`);

          return profileRef.set({
            createdAt: val.createdAt,
            title: val.title,
            featured: val.featured || false
          });
        }).then(function() {
          return ref.key;
        });
      },

      updateCohort: function(cohort) {
        if (!cohort || !cohort.$id || !cohort.$save) {
          return $q.reject(new Error('Cohort is not a firebase object'));
        }

        return cohort.$save().then(function() {
          var cohortId = cohort.$id;
        }).catch(function(err) {
          $log.error(err);
          return err;
        });
      },

      get: function(cohortId) {
        var ref = db.ref(`classMentors/cohorts/${cohortId}`);

        return loaded($firebaseObject(ref));
      },

      listAllCohorts: function() {
        var ref = db.ref('classMentors/cohorts');
        var query = ref.orderByChild('createdAt').limitToLast(50);

        return loaded($firebaseArray(query));
      },

      listFeaturedCohorts: function() {
        var ref = db.ref('classMentors/cohorts');
        var query = ref.orderByChild('featured').equalTo(true).limitToLast(50);

        return loaded($firebaseArray(query));
      },

      listCreatedCohorts: function() {
        return spfAuthData.user().then(function(authData) {
          var ref, query;

          if (!authData.publicId) {
            return [];
          }

          ref = db.ref(`classMentors/userProfiles/${authData.publicId}/createdCohorts`);
          query = ref.orderByChild('createdAt').limitToLast(50);

          return loaded($firebaseArray(query));
        }).catch(function(err) {
          $log.error(`Failed to list created cohorts: ${err}`);

          return [];
        });
      },

      addEvent: function(cohortId, eventId, eventNum) {
        var ref = db.ref(`classMentors/cohorts/${cohortId}/events/${eventNum}`);

        return ref.set(eventId);
      },

      removeEvent: function(cohortId, newEventArray) {
        var ref = db.ref(`classMentors/cohorts/${cohortId}/events`);

        $log.error(new Error(
          'TODO: fix race condition by removing event child instead of replacing the list.'
        ));

        return ref.set(newEventArray);
      },

      addAnnouncement: function(cohortId, madeBy, announcement, isArchived) {
        var rootRef = db.ref(`classMentors/cohortAnnouncements/${cohortId}`);
        var ref = rootRef.push();
        var priority = announcement.priority;
        var promise;

        announcement.madeAt = {'.sv': 'timestamp'};
        announcement.madeBy = madeBy.publicId;

        promise = priority ? ref.setWithPriority(announcement, priority) : ref.set(announcement);

        return promise.then(function() {
          return ref;
        });
      },

      getAnnouncements: function(cohortId) {
        var ref = db.ref(`classMentors/cohortAnnouncements/${cohortId}`);
        var query = ref.orderByChild('createdAt').limitToLast(50);

        return loaded($firebaseArray(query));
      },

      featureAnnouncement: function(cohortId, announcementId) {
        var ref = db.ref(`classMentors/cohortAnnouncements/${cohortId}/${announcementId}/featured`);

        return ref.set(true);
      },

      unfeatureAnnouncement: function(cohortId, announcementId) {
        var ref = db.ref(`classMentors/cohortAnnouncements/${cohortId}/${announcementId}/featured`);

        return ref.set(false);
      },

      showAnnouncement: function(cohortId, announcementId) {
        var ref = db.ref(`classMentors/cohortAnnouncements/${cohortId}/${announcementId}/visible`);

        return ref.set(true);
      },

      hideAnnouncement: function(cohortId, announcementId) {
        var ref = db.ref(`classMentors/cohortAnnouncements/${cohortId}/${announcementId}/visible`);

        return ref.set(false);
      }

    },

    events: {
      addTaskWithAns: function(eventId, task, isOpen, answers) {
        var rootRef = db.ref(`classMentors/eventTasks/${eventId}`);
        var ref = rootRef.push();
        var priority = task.priority;
        var promise;

        $log.info('Eventid is ? ', eventId);
        $log.info('task is : ', task);

        if (isOpen) {
          task.openedAt = {'.sv': 'timestamp'};
          task.closedAt = null;
        } else {
          task.closedAt = {'.sv': 'timestamp'};
          task.openedAt = null;
        }

        promise = priority ? ref.setWithPriority(task, priority) : ref.set(task);

        return promise.then(function() {
          var taskId = ref.key;
          var answerRef = db.ref(`classMentors/eventAnswers/${eventId}/${taskId}`);

          return answerRef.set(answers);
        });
      },

      getTaskAnswers: function(eventId, taskId) {
        var ref = db.ref(`classMentors/eventAnswers/${eventId}/${taskId}`);

        return loaded($firebaseObject(ref));
      },

      addTeamFormation: function(eventId, task, priority) {
        return spfFirebase.push(['classMentors/eventTasks', eventId], task).then(function(ref) {
          ref.setPriority(priority);
          return ref;
        });
      },

      addTrat: function(eventId, task, priority) {
        return spfFirebase.push(['classMentors/eventTasks', eventId], task).then(function(ref) {
          ref.setPriority(priority);
          var taskId = ref.key();
          return ref;
        });
      },

      updateTaskWithAns: function(eventId, taskId, task, answers) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}/${taskId}`);
        var ansRef = db.ref(`classMentors/eventAnswers/${eventId}/${taskId}`);
        var priority = task.priority;

        return ref.setWithPriority(task, priority).then(function() {
          return ansRef.set(answers);
        });
      },

      addTaskAnswers: function(eventId, answers) {
        var ref = db.ref(`classMentors/eventAnswers/${eventId}`);

        return ref.push(answers);
      },

      errNoPublicId: new Error('You should have a public id to join an event'),

      list: function() {
        var ref = db.ref('classMentors/events');
        var query = ref.orderByChild('featured').equalTo(true).limitToLast(50);

        return loaded($firebaseArray(query));
      },

      listAll: function() {
        var ref = db.ref('classMentors/events');
        var query = ref.orderByChild('createdAt');

        return loaded($firebaseObject(query));
      },

      listAllArr: function() {
        var ref = db.ref('classMentors/events');
        var query = ref.orderByChild('createdAt');

        return loaded($firebaseArray(query));
      },

      listCreatedEvents: function() {
        return spfAuthData.user().then(function(authData) {
          var ref, query;

          if (!authData.publicId) {
            return [];
          }

          ref = db.ref(`classMentors/userProfiles/${authData.publicId}/createdEvents`);
          query = ref.orderByChild('createdAt').limitToLast(50);

          return loaded($firebaseArray(query));
        }).catch(function(err) {
          $log.error(`Failed to list created events: ${err}`);

          return [];
        });
      },

      listJoinedEvents: function() {
        return spfAuthData.user().then(function(authData) {
          var ref, query;

          if (!authData.publicId) {
            return [];
          }

          ref = db.ref(`classMentors/userProfiles/${authData.publicId}/joinedEvents`);
          query = ref.orderByChild('createdAt').limitToLast(50);

          return loaded($firebaseArray(query));
        }).catch(function(err) {
          $log.error(`Failed to list joined events: ${err}`);

          return [];
        });
      },

      listJoinedEventsObj: function() {
        return spfAuthData.user().then(function(authData) {
          var ref, query;

          if (!authData.publicId) {
            return [];
          }

          ref = db.ref(`classMentors/userProfiles/${authData.publicId}/joinedEvents`);
          query = ref.orderByChild('createdAt').limitToLast(50);

          return loaded($firebaseObject(query));
        }).catch(function(err) {
          $log.error(`Failed to list joined events: ${err}`);

          return [];
        });
      },

      create: function(event, password) {
        var eventRef = db.ref('classMentors/events').push(event);

        var eventId = eventRef.key;
        var passwordRef = db.ref(`classMentors/eventPasswords/${eventId}`);

        var ownerId = event.owner.publicId;
        var profileRef = db.ref(`classMentors/userProfiles/${ownerId}/createdEvents/${eventId}`);

        return eventRef.then(function() {
          var hash = spfCrypto.password.newHash(password);
          var opts = {
            hash: hash.value,
            options: hash.options
          };

          return passwordRef.set(opts);
        }).then(function() {
          return eventRef.once('value');
        }).then(function(snapshot) {
          var val = snapshot.val();

          return profileRef.set({
            createdAt: val.createdAt,
            title: val.title,
            featured: val.featured || false
          });
        }).then(function() {
          return eventId;
        });
      },

      updateEvent: function(event, password) {
        var eventId = event && event.$id;
        var ownerId = event && event.owner && event.owner.publicId;
        var passwordRef, profileRef;

        if (!eventId || !ownerId) {
          return $q.reject(new Error('Event is not a firebase object'));
        }

        passwordRef = db.ref(`classMentors/eventPasswords/${eventId}`);
        profileRef = db.ref(`classMentors/userProfiles/${ownerId}/createdEvents/${eventId}`);

        return event.$save().then(function() {
          var hash, opts;

          if (!password) {
            return null;
          }

          hash = spfCrypto.password.newHash(password);
          opts = {
            hash: hash.value,
            options: hash.options
          };

          return passwordRef.set(opts);
        }).then(function() {
          return profileRef.update({
            title: event.title,
            featured: event.featured || false
          });
        }).catch(function(err) {
          $log.error(err);

          return err;
        });
      },

      get: function(eventId) {
        var ref = db.ref(`classMentors/events/${eventId}`);

        return loaded($firebaseObject(ref));
      },

      getRanking: function(eventId) {
        var ref = db.ref(`classMentors/eventRankings/${eventId}`);

        return loaded($firebaseObject(ref)).then(function(ranking) {
          setRankInSchool();
          ranking.$watch(setRankInSchool);

          return ranking;

          function setRankInSchool() {

            // 1. sort participant by school
            var schoolRankings = Object.keys(ranking).filter(function(publicId) {
              return publicId.length > 0 && ranking[publicId] && ranking[publicId].user;
            }).reduce(function(all, publicId) {
              var participant = ranking[publicId];
              var schoolId;

              if (
                participant.user.school == null || !participant.user.school.name || !participant.user.school.type
              ) {
                return all;
              }

              schoolId = `${participant.user.school.type}/${participant.user.school.name}`;
              if (!all[schoolId]) {
                all[schoolId] = [];
              }

              all[schoolId].push(participant);

              return all;
            }, {});

            Object.keys(schoolRankings).map(function(schoolId) {

              // 2. Sort each school participants in their school
              schoolRankings[schoolId].sort(function(a, b) {

                //  sort on total by desc. order.
                if (a.total !== b.total) {
                  return b.total - a.total;
                }

                if (!a.user || a.user.displayName) {
                  return -1;
                }

                if (!b.user || b.user.displayName) {
                  return 1;
                }

                // sort by display name if total is equal (asc. order)
                return a.user.displayName.localeCompare(b.user.displayName);
              });

              return schoolRankings[schoolId];
            }).forEach(function(sortedParticipants) {

              // 3. add `$rankInSchool` property
              sortedParticipants.forEach(function(p, index) {
                p.$rankInSchool = index + 1;
              });
            });
          }
        });
      },

      getProgress: function(eventId) {
        var ref = db.ref(`classMentors/eventProgress/${eventId}`);

        return loaded($firebaseObject(ref));
      },

      getTeam: function(eventId, taskId, teamId){
        var ref = db.ref(`classMentors/eventTeams/${eventId}/${taskId}/${teamId}`);
        return loaded($firebaseObject(ref)).then(function(result){
          console.log("result sissssss:", Object.keys(result));
          return Object.keys(result);
        });
      },

      getUserProgress: function(eventId, publicId) {
        var ref = db.ref(`classMentors/eventProgress/${eventId}/${publicId}`);

        return loaded($firebaseObject(ref));
      },

      getSolutions: function(eventId) {
        var ref = db.ref(`classMentors/eventSolutions/${eventId}`);

        return loaded($firebaseObject(ref));
      },

      getScores: function(eventId) {
        var ref = db.ref(`classMentors/eventScores/${eventId}`);

        return loaded($firebaseObject(ref));
      },

      getUserSolutions: function(eventId, publicId) {
        var ref = db.ref(`classMentors/eventSolutions/${eventId}/${publicId}`);

        return loaded($firebaseObject(ref));
      },

      getTasks: function(eventId) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}`);
        var query = ref.orderByPriority();

        return loaded($firebaseArray(query));
      },

      getTask: function(eventId, taskId) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}/${taskId}`);

        return loaded($firebaseObject(ref));
      },

      addTask: function(eventId, task, isOpen) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}`).push();
        var priority = task.priority;
        var promise;

        if (isOpen) {
          task.openedAt = {'.sv': 'timestamp'};
          task.closedAt = null;
        } else {
          task.closedAt = {'.sv': 'timestamp'};
          task.openedAt = null;
        }

        $log.info(`Adding task (id: "${ref.key}") to event id "${eventId}"`);
        $log.info(`Task: ${JSON.stringify(task)}`);

        promise = priority ? ref.setWithPriority(task, priority) : ref.set(task);

        return promise.then(function() {
          return ref;
        });
      },

      updateTask: function(eventId, taskId, task) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}/${taskId}`);
        var priority = task.priority;

        return ref.setWithPriority(task, priority);
      },

      openTask: function(eventId, taskId) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}/${taskId}`);
        var abort;

        return ref.transaction(function(task) {
          if (!task.closedAt) {
            return abort;
          }

          task.history = task.history || {};
          task.history[task.closedAt] = 'closed';
          task.openedAt = {'.sv': 'timestamp'};
          task.closedAt = null;

          return task;
        });
      },

      closeTask: function(eventId, taskId) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}/${taskId}`);
        var abort;

        return ref.transaction(function(task) {
          if (!task.openedAt) {
            return abort;
          }

          task.history = task.history || {};
          task.history[task.openedAt] = 'opened';
          task.closedAt = {'.sv': 'timestamp'};
          task.openedAt = null;

          return task;
        });
      },

      showTask: function(eventId, taskId) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}/${taskId}/hidden`);

        return ref.set(false);
      },

      hideTask: function(eventId, taskId) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}/${taskId}/hidden`);

        return ref.set(true);
      },

      archiveTask: function(eventId, taskId) {
        var ref = db.ref(`classMentors/eventTasks/${eventId}/${taskId}/archived`);

        return ref.set(true);
      },

      ParticipantsFirebaseArray,

      participants: function(eventId) {
        return loaded(clmDataStore.events.ParticipantsFirebaseArray.create(eventId));
      },

      join: function(event, pw) {
        var refs, authData, eventId;

        if (!event || !event.$id) {
          return $q.reject('Event was not provided');
        }

        eventId = event.$id;

        return spfAuthData.user().then(function(_authData) {
          var uid = spfAuth.user && spfAuth.user.uid;
          var publicId = _authData && _authData.publicId;

          authData = _authData;

          if (!publicId) {
            return $q.reject(clmDataStore.events.errNoPublicId);
          }

          refs = {
            hashOptions: db.ref(`classMentors/eventPasswords/${eventId}/options`),
            application: db.ref(`classMentors/eventApplications/${eventId}/${uid}`),
            participation: db.ref(`classMentors/eventParticipants/${eventId}/${publicId}`),
            profile: db.ref(`classMentors/userProfiles/${publicId}/joinedEvents/${eventId}`)
          };

          return refs;
        }).then(function() {
          return refs.hashOptions.once('value');
        }).then(function(snapshot) {
          var options = snapshot.val();
          var hash = spfCrypto.password.fromSalt(pw, options.salt, options);

          return refs.application.set(hash);
        }).then(function() {
          return refs.participation.set({
            user: {
              displayName: authData.displayName,
              gravatar: authData.gravatar,
              school: cleanObj(authData.school) || null
            },
            joinedAt: {'.sv': 'timestamp'}
          });
        }).then(function() {
          return refs.profile.set({
            createdAt: event.createdAt,
            featured: event.featured || false,
            owner: event.owner,
            title: event.title
          });
        });
      },

      leave: function(eventId) {
        return spfAuthData.user().then(function(authData) {
          return clmDataStore.events.removeParticpants(eventId, authData.publicId);
        });
      },

      removeParticpants: function(eventId, publicId) {
        var profileRef = db.ref(`classMentors/userProfiles/${publicId}/joinedEvents/${eventId}`);
        var particpantRef = db.ref(`classMentors/eventParticipants/${eventId}/${publicId}`);
        var rankingRef = db.ref(`classMentors/eventRankings/${eventId}/${publicId}`);

        return profileRef.remove().then(function() {
          return $q.all([
            particpantRef.remove(),
            rankingRef.remove()
          ]);
        }).catch(function(err) {
          $log.error(err);

          return err;
        });
      },

      // to be true the task only need registration.
      _hasRegistered: function(task, clmProfile, spfProfile) {
        var serviceId = task.serviceId;

        if (!task.serviceId || task.badge || task.singPathProblem) {
          return false;
        }

        if (serviceId === 'singPath') {
          return Boolean(spfProfile);
        }

        return (
          clmProfile.services &&
          clmProfile.services[serviceId] &&
          clmProfile.services[serviceId].details &&
          clmProfile.services[serviceId].details.id
        );
      },

      _hasBadge: function(task, badges) {
        if (
          !task.badge || !task.badge.id
        ) {
          return false;
        }

        var serviceId = task.serviceId;

        return (
          task.badge &&
          task.badge.id &&
          badges[serviceId] &&
          badges[serviceId][task.badge.id]
        );
      },

      _hasSolvedSingpathProblem: function(task, profile) {

        if (
          !task.singPathProblem || !task.singPathProblem.path || !task.singPathProblem.path.id || !task.singPathProblem.level || !task.singPathProblem.level.id || !task.singPathProblem.problem || !task.singPathProblem.problem.id
        ) {
          return false;
        }

        var queueId = 'default';

        return clmDataStore.singPath.hasSolved(
          profile,
          task.singPathProblem.path.id,
          task.singPathProblem.level.id,
          task.singPathProblem.problem.id,
          queueId
        );
      },

      _isSolutionLinkValid: function(task, solutions) {
        return (
          task.linkPattern &&
          solutions &&
          solutions[task.$id] &&
          solutions[task.$id].match &&
          solutions[task.$id].match(task.linkPattern)
        );
      },

      _isResponseValid: function(task, solutions) {
        return (
          task.textResponse &&
          solutions &&
          solutions[task.$id]
        );
      },

      _hasDoneSurvey: function(task, solutions) {
        return (
          task.survey &&
          solutions &&
          solutions[task.$id]
        );
      },

      _hasDoneMcq: function(task, solutions) {
        return (
          task.mcqQuestions &&
          solutions &&
          solutions[task.$id]
        );
      },
      _hasFormTeam: function(task, solutions) {
        return (
          task.formationPattern &&
          solutions &&
          solutions[task.$id]
        );
      },

      _solvedProblems: function(singPathProfile) {
        var queueId = 'default';

        return clmDataStore.singPath.countSolvedSolution(singPathProfile, queueId);
      },

      _getProgress: function(tasks, data) {

        // Transform array of badges to a collection of badges.
        var badges = Object.keys(data.badges).reduce(function(serviceBadges, serviceId) {
          serviceBadges[serviceId] = data.badges[serviceId].reduce(function(results, badge) {
            results[badge.id] = badge;
            return results;
          }, {});
          return serviceBadges;
        }, {});

        return tasks.reduce(function(progress, task) {

          // We never recheck archived task completeness
          if (task.archived) {
            if (data.progress && data.progress[task.$id]) {
              progress[task.$id] = data.progress[task.$id];
            }
            return progress;
          }

                    // We recheck solved closed tasks in case requirements changed.
          if (
            task.closedAt && !(
              data.progress &&
              data.progress[task.$id] &&
              data.progress[task.$id].completed
            )
          ) {
            return progress;
          }

          var solved = (
            clmDataStore.events._isSolutionLinkValid(task, data.solutions) ||
            clmDataStore.events._isResponseValid(task, data.solutions) ||
            clmDataStore.events._hasRegistered(task, data.classMentors, data.singPath) ||
            clmDataStore.events._hasBadge(task, badges) ||
            clmDataStore.events._hasSolvedSingpathProblem(task, data.singPath) ||
            clmDataStore.events._hasDoneSurvey(task, data.solutions) ||
            clmDataStore.events._hasDoneMcq(task, data.solutions) ||
            clmDataStore.events._hasFormTeam(task, data.solutions)
          );

          if (solved) {
            progress[task.$id] = {completed: true};
          }

          return progress;
        }, {});
      },

      _getRanking: function(data) {
        var ranking = {
          singPath: clmDataStore.events._solvedProblems(data.singPath),
          codeCombat: data.badges.codeCombat.length,
          codeSchool: data.badges.codeSchool.length
        };

        ranking.total = Object.keys(ranking).reduce(function(sum, key) {
          return sum + ranking[key];
        }, 0);

        ranking.user = data.classMentors.user;

        return ranking;
      },

      monitorEvent: function(event, tasks, participants, solutions, progress) {
        var tid;
        var delay = 300;
        var unWatchSolution = solutions.$watch(debouncedUpdate);
        var unWatchParticipants = participants.$watch(debouncedUpdate);

        function update() {
          return participants.map(function(participant) {
            return clmDataStore.events.updateProgress(
              event, tasks, solutions, participant.$id, progress[participant.$id]
            );
          });

        }

        function debouncedUpdate() {
          if (tid) {
            $timeout.cancel(tid);
          }

          tid = $timeout(update, delay, false);
        }

        debouncedUpdate();
        return {
          update: debouncedUpdate,
          unwatch: function stopMonitorEvent() {
            unWatchParticipants();
            unWatchSolution();
          }
        };
      },

      updateProgress: function(event, tasks, solutions, publicId, userProgress) {
        if (!publicId) {
          return $q.reject('User public id is missing missing.');
        }

        if (!solutions || !solutions.$id || solutions.$id !== event.$id) {
          return $q.reject('User solutions are missing');
        }

        var cmProfilePromise = clmDataStore.profile(publicId);
        var badgesPromise = cmProfilePromise.then(function(profile) {
          return $q.all({
            codeCombat: clmDataStore.services.codeCombat.fetchBadges(profile),
            codeSchool: clmDataStore.services.codeSchool.fetchBadges(profile)
          });
        });

        // 1. load profile, badges and current progress
        return $q.all({
          singPath: clmDataStore.singPath.profile(publicId),
          classMentors: cmProfilePromise,
          badges: badgesPromise,
          solutions: solutions[publicId] || {},
          progress: userProgress
        }).then(function(data) {
          var rankingRef = db.ref(`classMentors/eventRankings/${event.$id}/${data.classMentors.$id}`);

          // var detailsRef = db.ref(`classMentors/eventParticipants/${event.$id}/${data.classMentors.$id}/user`);

          // 4. save data

          return $q.all([

            // 2. check completness and update progress if needed.
            $q.resolve(clmDataStore.events._getProgress(tasks, data)).then(function(progress) {
              var ref = db.ref(`classMentors/eventProgress/${event.$id}/${data.classMentors.$id}`);
              var updated = Object.keys(progress).some(function(taskId) {
                var wasCompleted = data.progress && data.progress[taskId] && data.progress[taskId].completed;
                var isCompleted = progress && progress[taskId] && progress[taskId].completed;

                return isCompleted !== wasCompleted;
              });

              if (updated) {
                return ref.set(progress);
              }

              return null;
            }),

            // 3. get ranking - if we get the ranking we could check it needs an update
            rankingRef.set(clmDataStore.events._getRanking(data))

            // This was causing the endless loop of failed updates when viewing the ranking.
            // 5. update participants data
            // TODO: only update it if necessary.
            // detailsRef.set({
            //   displayName: data.classMentors.user.displayName,
            //   gravatar: data.classMentors.user.gravatar,
            //   school: data.classMentors.user.school || null
            // })
          ]);
        }).catch(function(err) {
          $log.error(`Failed to update progress of ${publicId}: ${err.toString()}`);
        });
      },

            /**
             * Only update the the current user profile and his/her event badge/problem solution.
             *
             * Only admin and event onwer can save the progress and ranking.
             *
             */
      updateCurrentUserProfile: function(event, tasks, userSolutions, profile) {
        if (!event || !event.$id || !userSolutions || !userSolutions.$id || !profile || !profile.$id) {
          return $q.reject(new Error('Event, userSolutions or profile are not valid firebase object'));
        }

        function solvedTask(task, solutions) {
          return Boolean(solutions[task.$id]);
        }

        return $q.all({

          // 1. Update user profile
          codeCombat: clmDataStore.services.codeCombat.updateProfile(profile),
          codeSchool: clmDataStore.services.codeSchool.updateProfile(profile),
          singPath: clmDataStore.singPath.profile(profile.$id)
        }).then(function(data) {
          return $q.all({
            singPath: data.singPath,
            badges: {
              codeCombat: clmDataStore.services.codeCombat.badges(profile),
              codeSchool: clmDataStore.services.codeSchool.badges(profile)
            }
          });
        }).then(function(data) {
          var updatedTasks = tasks.filter(function(task) {
            if (solvedTask(task, userSolutions)) {
              return false;
            }

            return (
              clmDataStore.events._hasRegistered(task, profile, data.singPath) ||
              clmDataStore.events._hasSolvedSingpathProblem(task, data.singPath) ||
              clmDataStore.events._hasBadge(task, data.badges)
            );
          }).map(function(task) {
            userSolutions[task.$id] = true;
            return task;
          });

          if (updatedTasks.length > 0) {
            userSolutions.$save();
          }

          return updatedTasks;
        }).catch(function(err) {
          $log.error(`Failed to update profile and soltuions of ${profile.$id}: ${err.toString()}`);
        });
      },

      // newly added codes by ky
      saveSurveyResponse: function(surveyResp, questionNumber, taskId, eventId, userId, surveyTask) {
        var ref;

        if (!surveyResp) {
          return $q.reject(new Error('No responses provided'));
        }
        if (!questionNumber) {
          return $q.reject(new Error('Invalid survey question'));
        }
        if (!taskId) {
          return $q.reject(new Error('No task id provided'));
        }
        if (!eventId) {
          return $q.reject(new Error('No event id provided'));
        }
        if (!userId) {
          return $q.reject(new Error('No user id provided'));
        }

        ref = db.ref(`classMentors/surveyResponse/${eventId}/${taskId}/${surveyTask}/${userId}/${questionNumber}`);

        return ref.set(surveyResp);
      },

      saveSurveyResponseOnSubmit: function(taskId, eventId, userId, surveyType, motiResp) {
        var ref = db.ref(`classMentors/surveyResponse/${eventId}/${taskId}/${surveyType}/${userId}`);

        return ref.set(motiResp);
      },

      saveSurveyEduDisResponse: function(surveyResp, questionNumber, taskId, eventId, userId, surveyTask, qnTitle) {
        var ref;

        if (!surveyResp) {
          return $q.reject(new Error('No responses provided'));
        }
        if (!questionNumber) {
          return $q.reject(new Error('Invalid survey question'));
        }
        if (!taskId) {
          return $q.reject(new Error('No task id provided'));
        }
        if (!eventId) {
          return $q.reject(new Error('No event id provided'));
        }
        if (!userId) {
          return $q.reject(new Error('No user id provided'));
        }
        if (!surveyTask) {
          return $q.reject(new Error('No survey task provided'));
        }
        if (!qnTitle) {
          return $q.reject(new Error('No question title provided'));
        }

        $log.info('qntitle isss', qnTitle);
        ref = db.ref(
          `classMentors/surveyResponse/${eventId}/${taskId}/${surveyTask}/${userId}/${qnTitle}/${questionNumber}`
        );

        return ref.set(surveyResp);
      },

      saveSurveyEduDisMultiResponse: function(responses, questionNumber, taskId, eventId, userId, surveyTask, qnTitle) {
        var ref;

        if (!responses) {
          return $q.reject(new Error('No responses provided'));
        }
        if (!questionNumber) {
          return $q.reject(new Error('Invalid survey question'));
        }
        if (!taskId) {
          return $q.reject(new Error('No task id provided'));
        }
        if (!eventId) {
          return $q.reject(new Error('No event id provided'));
        }
        if (!userId) {
          return $q.reject(new Error('No user id provided'));
        }
        if (!surveyTask) {
          return $q.reject(new Error('No survey task provided'));
        }
        if (!qnTitle) {
          return $q.reject(new Error('No question title provided'));
        }

        ref = db.ref(
          `classMentors/surveyResponse/${eventId}/${taskId}/${surveyTask}/${userId}/${qnTitle}/${questionNumber}`
        );

        return ref.set(responses);
      },

      submitSolution: function(eventId, taskId, publicId, link) {
        var ref;

        if (!eventId) {
          return $q.reject(new Error('No event id provided'));
        }

        if (!taskId) {
          return $q.reject(new Error('No task id provided'));
        }

        if (!publicId) {
          return $q.reject(new Error('No public id provided'));
        }
        ref = db.ref(`classMentors/eventSolutions/${eventId}/${publicId}/${taskId}`);

        return ref.set(link);
      },

      setProgress: function(eventId, taskId, publicId, progress) {
        var ref = db.ref(`classMentors/eventProgress/${eventId}/${publicId}/${taskId}`);

        return ref.set(progress[publicId][taskId]);
      },

      saveScore: function(eventId, publicId, taskId, score) {
        var ref;

        if (!eventId) {
          return $q.reject(new Error('No event id provided'));
        }

        if (!taskId) {
          return $q.reject(new Error('No task id provided'));
        }

        if (!publicId) {
          return $q.reject(new Error('No public id provided'));
        }

        ref = db.ref(`classMentors/eventScores/${eventId}/${publicId}/${taskId}`);

        return ref.set(score);
      },

      addAssistant: function(eventId, assistantId, assistant) {
        var ref = db.ref(`classMentors/events/${eventId}/assistants/${assistantId}`);

        return ref.set(assistant);
      },

      getAssistants: function(eventId) {
        var ref = db.ref(`classMentors/events/${eventId}/assistants`);

        return loaded($firebaseArray(ref));
      },

      getAsstObj: function(eventId) {
        var ref = db.ref(`classMentors/events/${eventId}/assistants`);

        return loaded($firebaseObject(ref));
      },

      enableAssistantEditing: function(eventId, assistantId) {
        var ref = db.ref(`classMentors/events/${eventId}/assistants/${assistantId}/canEdit`);

        return ref.set(true);
      },

      disableAssistantEditing: function(eventId, assistantId) {
        var ref = db.ref(`classMentors/events/${eventId}/assistants/${assistantId}/canEdit`);

        return ref.set(false);
      },

      enableAssistantReviewing: function(eventId, assistantId) {
        var ref = db.ref(`classMentors/events/${eventId}/assistants/${assistantId}/canReview`);

        return ref.set(true);
      },

      disableAssistantReviewing: function(eventId, assistantId) {
        var ref = db.ref(`classMentors/events/${eventId}/assistants/${assistantId}/canReview`);

        return ref.set(false);
      },

      removeAssistant: function(eventId, assistantId) {
        var ref = db.ref(`classMentors/events/${eventId}/assistants/${assistantId}`);

        return ref.remove();
      },

      questions: {

        /**
         * Return query to all event questions sorted by upvote.
         *
         * @param  {string}   eventId The event id to query question for.
         * @return {firebase.database.Reference}
         */
        allRef() {},

        /**
         * Create a question on behave of the current user.
         *
         * @param  {string}   eventId The event id to submit the question for.
         * @param  {{title: string, body: string}} details Question details
         * @return {Promise<firebase.database.Reference,Error>}
         */
        create() {},

        /**
         * Upvote a question.
         *
         * @param  {string}   eventId    The event id of the question.
         * @param  {string}   questionId The question id to upvote.
         * @return {Promise<void,Error>}
         */
        upVote() {},

        answers: {

          /**
           * Return query to all the answer of a question sorted by upvote.
           *
           * @param  {string}   eventId    The event id of the question.
           * @param  {string}   questionId The question id to query comments for.
           * @return {firebase.database.Reference}
           */
          allRef() {},

          /**
           * Create an answer on behave of the current user.
           *
           * @param  {string} eventId    The event id to submit the answer for.
           * @param  {string} questionId The question id to submit the answer for.
           * @param  {string} body       The answer body.
           * @return {Promise<firebase.database.Reference,Error>}
           */
          create() {},

          /**
           * Mark an answer as the accepted answer to the question.
           *
           * @param  {string} eventId    The event id to mark the answer for.
           * @param  {string} questionId The question id to mark the answer for.
           * @param  {string} answerId   The answer id to mark as accepted.
           * @return {Promise<void,Error>}
           */
          accept() {},

          /**
           * Upvote a comment.
           *
           * @param  {string}   eventId    The event id of the question.
           * @param  {string}   questionId The question id of the answer.
           * @param  {string}   answerId   The answer id to upvote.
           * @return {Promise<void,Error>}
           */
          upVote() {},

          /**
           * Add a comment to a question.
           *
           * @param  {string} eventId    The event id to add comment for.
           * @param  {string} questionId The question id to add comment for.
           * @param  {string} answerId   The answer id to add comment for.
           * @param  {string} body       The comment body.
           * @return {Promise<void,Error>}
           */
          comment() {}

        }

      }
    },

    services: clmServices,

    settings: {

      /**
       * Return Classmentors settings as a firebase synchronized array.
       *
       * Note that the array might not be loaded yet.
       *
       * @return {array}
       */
      get: function() {
        return $firebaseArray(db.ref('classMentors/settings'));
      },

      /**
       * Return Classmentors settings as a firebase synchronized array.
       *
       * Note that the array might not be loaded yet.
       *
       * @return {object}
       */
      getObj: function() {
        return $firebaseObject(db.ref('classMentors/settings'));
      }

    },

    singPath: {

      /**
       * Return user's singpath profile
       *
       */
      profile: function(publicId) {
        return $q.resolve(publicId).then(function(id) {
          var ref = db.ref(`singpath/userProfiles/${id}`);

          return loaded($firebaseObject(ref));
        });
      },

      queuedSolutions: function(publicId) {
        return $q.resolve(publicId).then(function(id) {
          var ref = db.ref(`singpath/userProfiles/${id}/queuedSolutions`);

          return loaded($firebaseObject(ref));
        });
      },

      hasSolved: function(profile, pathId, levelId, problemId, queueId) {
        return (
          profile &&
          profile.queuedSolutions &&
          profile.queuedSolutions[pathId] &&
          profile.queuedSolutions[pathId][levelId] &&
          profile.queuedSolutions[pathId][levelId][problemId] &&
          profile.queuedSolutions[pathId][levelId][problemId][queueId] &&
          profile.queuedSolutions[pathId][levelId][problemId][queueId].solved
        );
      },

      countSolvedSolution: function(profile, queueId) {
        var solutions = profile && profile.queuedSolutions;

        if (!solutions) {
          return 0;
        }

        queueId = queueId || 'default';
        return Object.keys(solutions).map(function(pathId) {
          return Object.keys(solutions[pathId]).map(function(levelId) {
            return Object.keys(solutions[pathId][levelId]).filter(function(problemId) {
              return (
                solutions[pathId][levelId][problemId][queueId] &&
                solutions[pathId][levelId][problemId][queueId].solved === true
              );
            }).length;
          }).reduce(function(sum, count) {
            return sum + count;
          }, 0);
        }).reduce(function(sum, count) {
          return sum + count;
        }, 0);
      },

      countSolvedSolutionPerLanguage: function(profile, queueId) {
        var paths = profile.queuedSolutions || {};

        queueId = queueId || 'default';
        return Object.keys(paths).reduce(function(result, pathKey) {
          var levels = paths[pathKey] || {};

          Object.keys(levels).forEach(function(levelKey) {
            var problems = levels[levelKey] || {};

            Object.keys(problems).forEach(function(problemKey) {
              var language = problems[problemKey][queueId].language;

              if (
                problems[problemKey][queueId] &&
                problems[problemKey][queueId].solved
              ) {
                result[language] = (result[language] || 0) + 1;
              }
            });
          });
          return result;
        }, {});
      },

      /**
       * Return a map of available paths at SingPath
       *
       */
      paths: function() {
        var ref = db.ref('singpath/paths');

        return ref.once('value').then(function(snapshot) {
          var paths = snapshot.val();

          return Object.keys(paths).reduce(function(all, id) {
            if (!id || id[0] === '$') {
              return all;
            }

            all[id] = {
              id: id,
              title: paths[id].title,
              url: `${clmServicesUrl.singPath}/#paths/${id}/levels`
            };

            return all;
          }, {});
        });
      },

      /**
       * Return a map of available levels at SingPath for a specific path
       *
       */
      levels: function(pathId) {
        var ref = db.ref(`singpath/levels/${pathId}`);

        return ref.once('value').then(function(snapshot) {
          var levels = snapshot.val();

          return Object.keys(levels).reduce(function(all, id) {
            if (!id || id[0] === '$') {
              return all;
            }

            all[id] = {
              id: id,
              title: levels[id].title,
              url: `${clmServicesUrl.singPath}/#paths/${pathId}/levels/${id}/problems`
            };

            return all;
          }, {});
        });
      },

      /**
       * Return a map of available problems at SingPath for a specific level
       *
       */
      problems: function(pathId, levelId) {
        var ref = db.ref(`singpath/problems/${pathId}/${levelId}`);

        return ref.once('value').then(function(snapshot) {
          var problems = snapshot.val();

          return Object.keys(problems).reduce(function(all, id) {
            if (!id || id[0] === '$') {
              return all;
            }

            all[id] = {
              id: id,
              title: problems[id].title,
              url: `${clmServicesUrl.singPath}/#paths/${pathId}/levels/${levelId}/problems/${id}/play`
            };

            return all;
          }, {});
        });
      },

      /**
       * Return a promise resolving to all problems as as simple object
       * (Not a firebase object).
       *
       * @return {Promise}
       */
      allProblems: function() {
        var ref = db.ref('singpath/problems');

        return ref.once('value').then(function(snapshot) {
          return snapshot.val();
        });
      },

      countProblems: function(paths) {
        return Object.keys(paths || {}).reduce(function(result, pathKey) {
          var levels = paths[pathKey] || {};

          Object.keys(levels).forEach(function(levelKey) {
            var problems = levels[levelKey] || {};

            Object.keys(problems).forEach(function(problemKey) {
              var language = problems[problemKey].language;

              result[language] = (result[language] || 0) + 1;
            });
          });

          return result;
        }, {});
      }
    }
  };

  // TODO: rename.
  clmDataStore.badges = {
    all: function() {
      return $q.all(Object.keys(clmDataStore.services).reduce(function(all, serviceId) {
        all[serviceId] = clmDataStore.services[serviceId].availableBadges();
        return all;
      }, {}));
    }
  };

  return clmDataStore;
}
clmDataStoreFactory.$inject = [
  '$window',
  '$location',
  '$q',
  '$log',
  '$http',
  '$timeout',
  'firebaseApp',
  '$firebaseObject',
  '$firebaseArray',
  'spfSchools',
  'routes',
  'spfAuth',
  'spfAuthData',
  'spfCrypto',
  'clmServices',
  'clmServicesUrl'
];