/**
 * classmentors/services.js
 */
/* eslint valid-jsdoc: "off", no-underscore-dangle: "off" */
import {cleanObj} from 'singpath-core/services/firebase.js';

function loaded(syncObjOrArray) {
  return syncObjOrArray.$loaded().then(() => syncObjOrArray);
}

class UserIdTakenError extends Error {

  constructor(serviceId, userId, ownerPublicId) {
    super(`This account is already registered with ${ownerPublicId}`);
    this.serviceId = serviceId;
    this.userId = userId;
    this.owner = ownerPublicId;
  }

}

export function clmServiceFactory($q, $log, firebaseApp, $firebaseObject, $firebaseArray) {
  var db = firebaseApp.database();
  var availableBadgesPromise = {};

  return function clmService(serviceId, mixin) {
    var service = {
      errNotImplemented: new Error('Not implemented'),

      /**
       * Return a promise resolving to all avalaible badges at
       * that service.
       */
      availableBadges: function() {
        var ref, badges;

        if (availableBadgesPromise[serviceId]) {
          return availableBadgesPromise[serviceId];
        }

        ref = db.ref(`classMentors/badges/${serviceId}`);
        badges = $firebaseObject(ref);
        availableBadgesPromise[serviceId] = loaded(badges);

        return availableBadgesPromise[serviceId];
      },

      /**
       * Return the list of saved badges for the service and user.
       *
       * @return {object}
       */
      badges: function(profile) {
        if (
          profile &&
          profile.services &&
          profile.services[serviceId] &&
          profile.services[serviceId].badges
        ) {
          return profile.services[serviceId].badges;
        }

        return {};
      },

      /**
       * Return the details of of the user for that service.
       *
       * It will return undefined if the details are for that service are
       * not set or if the user id is missing.
       *
       * @param {firebaseObj} profile Class Mentor profile of a user
       *
       */
      details: function(profile) {
        if (
          profile &&
          profile.services &&
          profile.services[serviceId] &&
          profile.services[serviceId].details &&
          profile.services[serviceId].details.id
        ) {
          return profile.services[serviceId].details;
        }

        return undefined;
      },

      /**
       * Claim the user name for the service and save his/her details
       *
       * @param  {string} publicId user's publiId.
       * @param  {object} details  details object holding the user id and user name.
       *                           of the user for that service.
       * @return {Promise}         Promise resolving to the updated Class Mentor profile
       *                           service details firebase ref.
       */
      saveDetails: function(publicId, details) {
        var ref;

        if (!publicId) {
          return $q.reject(new Error('The Classmentors profile should have an id.'));
        }

        if (!details || !details.id) {
          return $q.reject(new Error(
            `The user details for ${serviceId} should include an id.`
          ));
        }

        ref = firebaseApp.ref(`classMentors/servicesUserIds/${serviceId}/${details.id}`);

        return ref.set(publicId).catch(function(err) {
          return service.userIdOwner(details.id).then(function(obj) {
            if (obj.$value == null) {
              return $q.reject(err);
            }

            if (obj.$value === publicId) {
              $log.error(`Claiming user id reported failed but seems to be rightly set: ${err}`);

              return undefined;
            }

            return $q.reject(new UserIdTakenError(serviceId, details.id, obj.$value));
          });
        }).then(function() {
          var detailsRef = db.ref(`classMentors/userProfiles/${publicId}/services/${serviceId}/details`);

          return detailsRef.set({
            id: details.id,
            name: details.name,
            registeredBefore: {'.sv': 'timestamp'}
          });
        }).catch(function(err) {
          $log.error(err);

          if (err.constructor === UserIdTakenError) {
            return $q.reject(err);
          }

          return $q.reject(new Error(`Failed to save your details for ${serviceId}`));
        });
      },

      /**
       * Remove the service data.
       *
       * @param  {string}  publicId user's publiId.
       * @param  {string}  userId   user's id for service of the user for that service.
       * @return {Promise}          Promise resolving when the service has been removed.
       */
      removeDetails: function(publicId, userId) {
        var profileRef;

        if (!publicId) {
          return $q.reject(new Error('The Classmentors profile should have an id.'));
        }

        if (!userId) {
          return $q.reject(new Error('The profile should have an id for that service.'));
        }

        profileRef = db.ref(`classMentors/userProfiles/${publicId}/services/${serviceId}`);

        return profileRef.remove().then(function() {
          var userIdRef = db.ref(`classMentors/servicesUserIds/${serviceId}/${userId}`);

          return userIdRef.remove();
        });
      },

      /**
       * Test if a user name for a service is already claimed
       *
       * @param  {string}  userId The user id to test.
       * @return {Promise}        resolve to the a boolean. True if taken, false
       *                          otherwise.
       */
      userIdTaken: function(userId) {
        return service.userIdOwner(userId).then(function(sync) {
          return sync.$value !== null;
        });
      },

      /**
       * Return a promise resolving to a loaded AngularFire object for the service
       * user id owners public id.
       *
       * The public Id will be set to the `$value` attribute.
       *
       * @param  {string}  userId
       * @return {Promise}
       */
      userIdOwner: function(userId) {
        var ref = db.ref(`classMentors/servicesUserIds/${serviceId}/${userId}`);

        return loaded($firebaseObject(ref));
      },

      /**
       * Return a promise resolving to true if the user id exist;
       * resolved to false if it doesn't exist.
       *
       */
      userIdExist: function(userId) {
        if (!userId) {
          return $q.when(false);
        }
        return service.fetchProfile(userId).then(function() {
          return true;
        }).catch(function() {
          return false;
        });
      },

      /**
       * Fetch user's badges from 3rd party service and update user
       * profile with missing badges.
       *
       * Requires the service to implement `fetchBadges(profile)`.
       *
       * @param  {firebaseObj} profile Class Mentor profile of a user.
       * @return {Promise}             return promise resolving to a map of
       *                               of newly earned badges.
       */
      updateProfile: function(profile) {
        var knownBadges = service.badges(profile);

        return service.fetchBadges(profile).then(function(badges) {
          return badges.filter(function(badge) {
            return !knownBadges[badge.id];
          });
        }).then(function(newBadges) {
          var ref = db.ref(`classMentors/userProfiles/${profile.$id}/services/${serviceId}`);
          var patch = newBadges.reduce(function(result, badge) {
            result[`badges/${badge.id}`] = badge;

            return result;
          }, {lastUpdate: {'.sv': 'timestamp'}});

          return ref.update(patch).then(function() {
            return newBadges.reduce(function(badges, badge) {
              badges[badge.id] = badge;
              return badges;
            }, {});
          });
        });
      },

      /**
       * Fetch a user profile.
       *
       * @param  {string} userId Class Mentor profile of a user.
       * @return {Promise}       Promise resolving to profile.
       */
      fetchProfile: function(userId) {

        /* eslint no-unused-vars: 0 */
        return $q.reject(service.errNotImplemented);
      },

      /**
       * Fetch the user list of badge and normalize them.
       *
       * If the user details for the services are not set, it should resolve
       * to an empty array.
       *
       * @param  {firebaseObj} profile Class Mentor profile of a user.
       * @return {promise}             Promise resolving to an array of
       *                               new earned badges.
       */
      fetchBadges: function(profile) {

        /* eslint no-unused-vars: 0 */
        return $q.reject(service.errNotImplemented);
      },

      /**
       * Return the current user details on a 3rd party site.
       *
       * Might not be supported by the service.
       *
       * @return {Promise} Promise resolving to the user details
       *                   (an object holding the user id and name).
       */
      auth: function() {
        return $q.reject(service.errNotImplemented);
      }
    };

    return Object.assign(service, mixin || {});
  };
}
clmServiceFactory.$inject = ['$q', '$log', 'firebaseApp', '$firebaseObject', '$firebaseArray'];

/**
 * Service to interact with singpath firebase db
 *
 */
export function clmDataStoreFactory(
  $window, $location, $q, $log, $http, $timeout,
  firebaseApp, $firebaseObject, $firebaseArray, spfSchools,
  routes, spfAuth, spfAuthData, spfCrypto, clmService, clmServicesUrl
) {
  var clmDataStore;
  var db = firebaseApp.database();
  var settings = $firebaseArray(db.ref('classMentors/settings'));
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
      if (!spfAuth.user || !spfAuth.user.uid) {
        return $q.when();
      }

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

        var userSchool = userData.school && userData.school.name;
        var profileSchool = resp.currentUser.school && resp.currentUser.school.name;
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
      return $q.when(publicId).then(function(id) {
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
        var query = ref.orderByChild('createdAt').limitToLast(50);

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
        var profileRef = db.ref(`'classMentors/userProfiles/${ownerId}/createdEvents/${eventId}`);

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

        if (eventId || !ownerId) {
          return $q.reject(new Error('Event is not a firebase object'));
        }

        passwordRef = db.ref(`classMentors/eventPasswords/${eventId}`);
        profileRef = db.ref(`'classMentors/userProfiles/${ownerId}/createdEvents/${eventId}`);

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
                participant.user.school == null ||
                !participant.user.school.name ||
                !participant.user.school.type
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
          !task.badge ||
          !task.badge.id
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
          !task.singPathProblem ||
          !task.singPathProblem.path ||
          !task.singPathProblem.path.id ||
          !task.singPathProblem.level ||
          !task.singPathProblem.level.id ||
          !task.singPathProblem.problem ||
          !task.singPathProblem.problem.id
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

        _hasDoneSurvey: function (task, solutions) {
            return(
              task.survey &&
              solutions &&
              solutions[task.$id]
            );
        },

        _hasDoneMcq: function (task, solutions) {
            return(
                task.mcqQuestions &&
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
            task.closedAt &&
            !(
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
            clmDataStore.events._hasDoneMcq(task, data.solutions)
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
            $q.when(clmDataStore.events._getProgress(tasks, data)).then(function(progress) {
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
        if(!surveyTask){
            return $q.reject(new Error('No survey task provided'));
        }
        if(!qnTitle){
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
      }
    },

    services: {

      codeCombat: clmService('codeCombat', {
        errServerError: new Error('Failed to get logged in user info from Code Combat.'),
        errLoggedOff: new Error('The user is not logged in to Code Combat.'),
        errNoUserId: new Error('Your code combat user id is missing.'),
        errNoName: new Error('The user hasn\'t set a name.'),

        /**
         * Return the the user's levels.
         *
         */
        fetchProfile: function(userId) {
          if (!userId) {
            return $q.reject(clmDataStore.services.codeCombat.errNoUserId);
          }

          return $http.get([
            clmServicesUrl.backend,
            'proxy/codecombat.com/db/user', userId,
            'level.sessions?project=state.complete,levelID,levelName'
          ].join('/')).then(function(resp) {
            return resp.data;
          });
        },

        /**
         * Query the user's level and return a promise resolving to a
         * list of badge.
         *
         */
        fetchBadges: function(profile) {
          var details = clmDataStore.services.codeCombat.details(profile);

          // 2016 Stop badges from being fetched via backend url.
          return $q.when([]);

          /*
          if (!details) {
            return $q.when([]);
          }

          return $q.all({
            ccProfile: clmDataStore.services.codeCombat.fetchProfile(details.id),
            badges: clmDataStore.services.codeCombat.availableBadges()
          }).then(function(results) {
            return results.ccProfile.map(function(level) {
              var badgeId = level.levelID;

              if (
                !badgeId ||
                !results.badges[badgeId] ||
                !level.state ||
                !level.state.complete
              ) {
                return;
              }

              return Object.assign({}, results.badges[badgeId]);
            }).filter(function(badge) {
              return badge !== undefined;
            });
          }).catch(function(err) {
            $log.error('Failed to fetch code combat badges for ' + profile.$id);
            $log.error(err);
            return [];
          });
          */
        },

        auth: function() {
          return $http.jsonp('//codecombat.com/auth/whoami?callback=JSON_CALLBACK').then(function(resp) {
            if (resp.data.anonymous) {
              return $q.reject(clmDataStore.services.codeCombat.errLoggedOff);
            }

            if (!resp.data.name) {
              return $q.reject(clmDataStore.services.codeCombat.errNoName);
            }

            return {
              id: resp.data._id,
              name: resp.data.name
            };
          }, function(e) {
            $log.error(`Failed request to //codecombat.com/auth/whoami: ${e.toString()}`);
            return $q.reject(clmDataStore.services.codeCombat.errServerError);
          });
        },

        requestUserName: function() {
          return spfAuthData.user().then(function(authData) {
            authData.secretKey = spfCrypto.randomString(16);
            authData.secretKeyValidUntil = $window.Date.now() + (1000 * 60 * 15);
            return authData.$save().then(function() {
              return authData;
            });
          }).then(function(authData) {
            var cbUrl = [
              $location.protocol(),
              '://',
              $location.host()
            ];
            var port = $location.port();

            if (port !== 80) {
              cbUrl.push(`:${port}`);
            }

            $window.location.replace([
              'https://codecombat.com/identify?id=',
              authData.secretKey,
              '&callback=',
              $window.encodeURIComponent(
                cbUrl.concat([
                  $window.location.pathname || '/',
                  '#',
                  routes.setProfileCodeCombatId
                ]).join('')
              ),
              '&source=Class%20Mentors'
            ].join(''));
          });
        },

        setUser: function(userName, verificationKey) {
          return spfAuthData.user().then(function(authData) {
            if (!authData.secretKey || authData.secretKey !== verificationKey) {
              return $q.reject(new Error('Wrong verification key'));
            }

            if (!authData.secretKeyValidUntil || authData.secretKeyValidUntil < $window.Date.now()) {
              return $q.reject(new Error('The verification key is too old'));
            }

            var encodedName = $window.encodeURIComponent(userName);

            return $http.get([
              clmServicesUrl.backend,
              'proxy/codecombat.com/db/user', encodedName, 'nameToID'
            ].join('/')).then(function(resp) {
              return {
                auth: authData,
                userId: resp.data
              };
            });
          }).catch(function(err) {
            $log.error(err);
            return $q.reject(new Error(
              `We failed to look up your Code Combat user id (user name ${userName}).`
            ));
          }).then(function(data) {
            if (!data.userId) {
              return $q.reject(new Error(
                `We failed to look up your Code Combat user id (user name ${userName}).`
              ));
            }

            return clmDataStore.services.codeCombat.saveDetails(
              data.auth.publicId, {
                id: data.userId,
                name: userName
              }
            );
          });
        }
      }),

      codeSchool: clmService('codeSchool', {
        errNoUserId: new Error('Your code school user id is missing.'),
        errNoBadgeUrl: new Error('No badge url.'),

        _badgeId: function(url, name) {
          var id;

          if (!url) {
            $log.error(clmDataStore.services.codeSchool.errNoBadgeUrl);

            return undefined;
          } else if (url.startsWith('http://www.codeschool.com/courses/')) {
            id = `${url.slice(34)}-${name}`;
          } else if (url.startsWith('https://www.codeschool.com/courses/')) {
            id = `${url.slice(35)}-${name}`;
          } else {
            $log.error(new Error(
              `A code school badge URL should start with "http://www.codeschool.com/courses/" (${url}).`
            ));

            return undefined;
          }

          return id.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        },

        fetchProfile: function(userId) {

          // 2016 skip fetching profiles from backend url.
          return $q.when([]);

          /*
          if (!userId) {
            return $q.reject(clmDataStore.services.codeSchool.errNoUserId);
          }

          return $http.get([
            clmServicesUrl.backend,
            'proxy/www.codeschool.com/users',
            userId + '.json'
          ].join('/')).then(function(resp) {
            return resp.data;
          });
          */
        },

        fetchBadges: function(profile) {
          var details = clmDataStore.services.codeSchool.details(profile);

          if (!details) {
            return $q.when([]);
          }

          return clmDataStore.services.codeSchool.fetchProfile(details.id).then(function(csProfile) {
            var badges = csProfile.badges || [];

            return badges.map(function(badge) {

              // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
              var badgeId = clmDataStore.services.codeSchool._badgeId(badge.course_url, badge.name);

              if (badgeId == null) {
                return undefined;
              }

              return {
                id: badgeId,
                name: badge.name,
                url: badge.course_url,
                iconUrl: badge.badge
              };
            }).filter(function(badge) {
              return badge !== undefined;
            });
          }).catch(function(err) {
            $log.error(`Failed to fetch code school badges for ${profile.$id}`);
            $log.error(err);
            return [];
          });
        }
      })
    },

    settings: {

      /**
       * Return Classmentors settings as a firebase synchronized array.
       *
       * Note that the array might not be loaded yet.
       *
       * @return {array}
       */
      get: function() {
        return settings;
      }
    },

    singPath: {

      /**
       * Return user's singpath profile
       *
       */
      profile: function(publicId) {
        return $q.when(publicId).then(function(id) {
          var ref = db.ref(`singpath/userProfiles/${id}`);

          return loaded($firebaseObject(ref));
        });
      },

      queuedSolutions: function(publicId) {
        return $q.when(publicId).then(function(id) {
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
  'clmService',
  'clmServicesUrl'
];

function objToArray(obj) {
  return Object.keys(obj).map(function(k) {
    return obj[k];
  });
}
