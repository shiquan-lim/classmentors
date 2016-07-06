/**
 * classmentors/services.js
 */

export function clmServiceFactory($q, $log, spfFirebase) {
  var availableBadges = {};
  var availableBadgesPromise = {};

  function UserIdTakenError(serviceId, userId, ownerPublicId) {
    this.name = 'UserIdTakenError';
    this.stack = (new Error()).stack;
    this.serviceId = serviceId;
    this.userId = userId;
    this.owner = ownerPublicId;
    this.message = `This account is already registered with ${ownerPublicId}`;
  }

  UserIdTakenError.prototype = Object.create(Error.prototype);
  UserIdTakenError.prototype.constructor = UserIdTakenError;

  return function clmService(serviceId, mixin) {
    var service = {
      errNotImplemented: new Error('Not implemented'),
      errUserIdTaken: UserIdTakenError,

      /**
       * Return a promise resolving to all avalaible badges at
       * that service.
       */
      availableBadges: function() {
        if (availableBadges[serviceId]) {
          return $q.when(availableBadges[serviceId]);
        }

        if (availableBadgesPromise[serviceId]) {
          return availableBadgesPromise[serviceId];
        }

        availableBadgesPromise[serviceId] = spfFirebase.loadedObj(
          ['classMentors/badges', serviceId]
        ).then(function(badges) {
          availableBadges[serviceId] = badges;
          return badges;
        });

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
        if (!publicId) {
          return $q.reject(new Error('The Classmentors profile should have an id.'));
        }

        if (!details || !details.id) {
          return $q.reject(new Error(
            `The user details for ${serviceId} should include an id.`
          ));
        }

        return spfFirebase.set(
          ['classMentors/servicesUserIds', serviceId, details.id],
          publicId
        ).catch(function(err) {
          return service.userIdOwner(details.id).then(function(obj) {
            if (obj.$value == null) {
              return $q.reject(err);
            }

            if (obj.$value === publicId) {
              $log.error(`Claiming user id reported failed but seems to be rightly set: ${err}`);
              return;
            }

            return $q.reject(new UserIdTakenError(serviceId, details.id, obj.$value));
          });
        }).then(function() {
          return spfFirebase.set(
            ['classMentors/userProfiles', publicId, 'services', serviceId, 'details'], {
              id: details.id,
              name: details.name,
              registeredBefore: {
                '.sv': 'timestamp'
              }
            }
          );
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
        if (!publicId) {
          return $q.reject(new Error('The Classmentors profile should have an id.'));
        }

        if (!userId) {
          return $q.reject(new Error('The profile should have an id for that service.'));
        }

        return spfFirebase.remove(
          ['classMentors/userProfiles', publicId, 'services', serviceId]
        ).then(function() {
          return spfFirebase.remove(
            ['classMentors/servicesUserIds', serviceId, userId]
          );
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
        return spfFirebase.loadedObj(['classMentors/servicesUserIds', serviceId, userId]);
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
          var patchRoot = ['classMentors/userProfiles', profile.$id, 'services', serviceId];
          var patch = newBadges.reduce(function(patch, badge) {
            patch[`badges/${badge.id}`] = badge;
            return patch;
          }, {lastUpdate: {'.sv': 'timestamp'}});

          return spfFirebase.patch(patchRoot, patch).then(function() {
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
clmServiceFactory.$inject = ['$q', '$log', 'spfFirebase'];

/**
 * Service to interact with singpath firebase db
 *
 */
export function clmDataStoreFactory(
  $window, $location, $q, $log, $http, $timeout,
  routes, spfFirebase, spfAuth, spfAuthData, spfCrypto, clmService, clmServicesUrl
) {
  var clmDataStore;

  clmDataStore = {
    _profileFactory: spfFirebase.objFactory({
      canView: function(obj) {
        var kind = obj && obj.$ref && obj.$ref().parent().path.toString();

        // if (this.user && this.user.isAdmin) {
        //   return true;
        // }

        if (obj.owner && obj.owner.publicId && this.$id === obj.owner.publicId) {
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
    }),

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
          return;
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
          userData.yearOfBirth === resp.currentUser.yearOfBirth &&
          userSchool === profileSchool
        ) {
          return resp.profile;
        }

        return clmDataStore.updateProfile(resp.currentUser);
      });
    },

    profile: function(publicId) {
      return $q.when(publicId).then(function(id) {
        return clmDataStore._profileFactory(['classMentors/userProfiles', id]).$loaded();
      });
    },

    updateProfile: function(userData) {
      return spfFirebase.patch(
        ['classMentors/userProfiles', userData.publicId, 'user'], {
          displayName: userData.displayName,
          gravatar: userData.gravatar,
          // cleanup optional values
          country: spfFirebase.cleanObj(userData.country),
          yearOfBirth: spfFirebase.cleanObj(userData.yearOfBirth),
          school: spfFirebase.cleanObj(userData.school)
        }
      ).then(function() {
        return clmDataStore.profile(userData.publicId);
      });
    },

    initProfile: function() {
      return spfAuthData.user().then(function(currentUser) {
        if (!currentUser || !currentUser.publicId) {
          return $q.reject(new Error('The user has not set a user public id.'));
        }

        return clmDataStore.updateProfile(currentUser);
      });
    },

    events: {
      errNoPublicId: new Error('You should have a public id to join an event'),

      list: function() {
        return spfFirebase.loadedArray(['classMentors/events'], {
          orderByChild: 'featured',
          equalTo: true,
          limitToLast: 50
        });
      },

      listCreatedEvents: function() {
        return spfAuthData.user().then(function(authData) {
          if (!authData.publicId) {
            return [];
          }

          return spfFirebase.loadedArray(['classMentors/userProfiles', authData.publicId, 'createdEvents'], {
            orderByChild: 'createdAt',
            limitToLast: 50
          });
        }).catch(function(err) {
          $log.error(`Failed to list created events: ${err}`);
          return [];
        });
      },

      listJoinedEvents: function() {
        return spfAuthData.user().then(function(authData) {
          if (!authData.publicId) {
            return [];
          }

          return spfFirebase.loadedArray(['classMentors/userProfiles', authData.publicId, 'joinedEvents'], {
            orderByChild: 'createdAt',
            limitToLast: 50
          });
        }).catch(function(err) {
          $log.error(`Failed to list created events: ${err}`);
          return [];
        });
      },

      create: function(event, password) {
        var hash, eventId;

        return spfFirebase.push(['classMentors/events'], event).then(function(ref) {
          eventId = ref.key();
          hash = spfCrypto.password.newHash(password);
          var opts = {
            hash: hash.value,
            options: hash.options
          };
          return spfFirebase.set(['classMentors/eventPasswords', eventId], opts);
        }).then(function() {
          return clmDataStore.events.get(eventId);
        }).then(function(eventObj) {
          return spfFirebase.set([
            'classMentors/userProfiles',
            eventObj.owner.publicId,
            'createdEvents',
            eventObj.$id
          ], {
            createdAt: eventObj.createdAt,
            title: eventObj.title,
            featured: eventObj.featured || false
          });
        }).then(function() {
          return eventId;
        });
      },

      updateEvent: function(event, password) {
        if (!event || !event.$id || !event.$save) {
          return $q.reject(new Error('Event is not a firebase object'));
        }

        return event.$save().then(function() {
          if (!password) {
            return;
          }

          var eventId = event.$id;
          var hash = spfCrypto.password.newHash(password);
          var opts = {
            hash: hash.value,
            options: hash.options
          };
          return spfFirebase.set(['classMentors/eventPasswords', eventId], opts);
        }).catch(function(err) {
          $log.error(err);
          return err;
        });
      },

      get: function(eventId) {
        return spfFirebase.loadedObj(['classMentors/events', eventId]);
      },

      getRanking: function(eventId) {
        return spfFirebase.loadedObj(['classMentors/eventRankings', eventId]).then(function(ranking) {
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
        return spfFirebase.loadedObj(['classMentors/eventProgress', eventId]);
      },

      getUserProgress: function(eventId, publicId) {
        return spfFirebase.loadedObj(['classMentors/eventProgress', eventId, publicId]);
      },

      getSolutions: function(eventId) {
        return spfFirebase.loadedObj(['classMentors/eventSolutions', eventId]);
      },

      getUserSolutions: function(eventId, publicId) {
        return spfFirebase.loadedObj(['classMentors/eventSolutions', eventId, publicId]);
      },

      getTasks: function(eventId) {
        return spfFirebase.loadedArray(['classMentors/eventTasks', eventId], {
          orderByPriority: true
        });
      },

      getTask: function(eventId, taskId) {
        return spfFirebase.loadedObj(['classMentors/eventTasks', eventId, taskId]);
      },

      addTask: function(eventId, task, isOpen) {
        var priority = task.priority || 0;

        if (isOpen) {
          task.openedAt = {'.sv': 'timestamp'};
          task.closedAt = null;
        } else {
          task.closedAt = {'.sv': 'timestamp'};
          task.openedAt = null;
        }

        return spfFirebase.push(['classMentors/eventTasks', eventId], task).then(function(ref) {
          ref.setPriority(priority);
          return ref;
        });
      },

      updateTask: function(eventId, taskId, task) {
        var priority = task.priority || 0;

        return spfFirebase.setWithPriority(
          ['classMentors/eventTasks', eventId, taskId],
          task,
          priority
        );
      },

      openTask: function(eventId, taskId) {
        var url = ['classMentors/eventTasks', eventId, taskId];

        return spfFirebase.transaction(url, function(task) {
          if (!task.closedAt) {
            return;
          }

          task.history = task.history || {};
          task.history[task.closedAt] = 'closed';
          task.openedAt = {'.sv': 'timestamp'};
          task.closedAt = null;
          return task;
        });
      },

      closeTask: function(eventId, taskId) {
        var url = ['classMentors/eventTasks', eventId, taskId];

        return spfFirebase.transaction(url, function(task) {
          if (!task.openedAt) {
            return;
          }

          task.history = task.history || {};
          task.history[task.openedAt] = 'opened';
          task.closedAt = {'.sv': 'timestamp'};
          task.openedAt = null;
          return task;
        });
      },

      showTask: function(eventId, taskId) {
        var url = ['classMentors/eventTasks', eventId, taskId, 'hidden'];
        return spfFirebase.set(url, false);
      },

      hideTask: function(eventId, taskId) {
        var url = ['classMentors/eventTasks', eventId, taskId, 'hidden'];
        return spfFirebase.set(url, true);
      },

      archiveTask: function(eventId, taskId) {
        var url = ['classMentors/eventTasks', eventId, taskId, 'archived'];
        return spfFirebase.set(url, true);
      },

      _participantsFactory: spfFirebase.arrayFactory({
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
      }),

      participants: function(eventId) {
        return clmDataStore.events._participantsFactory(
          ['classMentors/eventParticipants', eventId]
        ).$loaded();
        // return spfFirebase.loadedArray(['classMentors/eventParticipants', eventId]);
      },

      join: function(event, pw) {
        var paths, authData, eventId;

        if (!event || !event.$id) {
          return $q.reject('Event was not provided');
        }

        eventId = event.$id;

        return spfAuthData.user().then(function(_authData) {
          authData = _authData;

          if (!authData.publicId) {
            return $q.reject(clmDataStore.events.errNoPublicId);
          }

          paths = {
            hashOptions: ['classMentors/eventPasswords', eventId, 'options'],
            application: ['classMentors/eventApplications', eventId, spfAuth.user.uid],
            participation: ['classMentors/eventParticipants', eventId, authData.publicId, 'user'],
            profile: ['classMentors/userProfiles', authData.publicId, 'joinedEvents', eventId]
          };
        }).then(function() {
          return spfFirebase.loadedObj(paths.hashOptions);
        }).then(function(options) {
          var hash = spfCrypto.password.fromSalt(pw, options.salt, options);
          return spfFirebase.set(paths.application, hash);
        }).then(function() {
          return spfFirebase.set(paths.participation, {
            displayName: authData.displayName,
            gravatar: authData.gravatar,
            school: spfFirebase.cleanObj(authData.school) || null
          });
        }).then(function() {
          return spfFirebase.set(paths.profile, {
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
        return spfFirebase.remove([
          'classMentors/userProfiles', publicId, 'joinedEvents', eventId
        ]).then(function() {
          var urls = [
            'classMentors/eventParticipants',
            'classMentors/eventRankings'
          ];

          return $q.all(urls.map(function(url) {
            return spfFirebase.remove([url, eventId, publicId]);
          }));
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
            clmDataStore.events._hasSolvedSingpathProblem(task, data.singPath)
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
          // 4. save data
          return $q.all([
            // 2. check completness and update progress if needed.
            $q.when(clmDataStore.events._getProgress(tasks, data)).then(function(progress) {
              var updated = Object.keys(progress).some(function(taskId) {
                var wasCompleted = data.progress && data.progress[taskId] && data.progress[taskId].completed;
                var isCompleted = progress && progress[taskId] && progress[taskId].completed;

                return isCompleted !== wasCompleted;
              });

              if (updated) {
                return spfFirebase.set(
                  ['classMentors/eventProgress', event.$id, data.classMentors.$id],
                  progress
                );
              }
            }),
            // 3. get ranking - if we get the ranking we could check it needs an update
            spfFirebase.set(
              ['classMentors/eventRankings', event.$id, data.classMentors.$id],
              clmDataStore.events._getRanking(data)
            ),
            // 5. update participants data
            // TODO: only update it if necessary.
            spfFirebase.set(['classMentors/eventParticipants', event.$id, data.classMentors.$id, 'user'], {
              displayName: data.classMentors.user.displayName,
              gravatar: data.classMentors.user.gravatar,
              school: data.classMentors.user.school || null
            })
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
          $log.error(`Failed to update profile and soltuions of ${profile.$id}: { err.toString()}`);
        });
      },

      submitSolution: function(eventId, taskId, publicId, link) {
        if (!eventId) {
          return $q.reject(new Error('No event id provided'));
        }

        if (!taskId) {
          return $q.reject(new Error('No task id provided'));
        }

        if (!publicId) {
          return $q.reject(new Error('No task id provided'));
        }

        return spfFirebase.set([
          'classMentors/eventSolutions', eventId, publicId, taskId
        ], link);
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
            return;
          } else if (url.startsWith('http://www.codeschool.com/courses/')) {
            id = `${url.slice(34)}-${name}`;
          } else if (url.startsWith('https://www.codeschool.com/courses/')) {
            id = `${url.slice(35)}-${name}`;
          } else {
            $log.error(new Error(
              `A code school badge URL should start with "http://www.codeschool.com/courses/" (${url}).`
            ));
            return;
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

    singPath: {
      /**
       * Return user's singpath profile
       *
       */
      profile: function(publicId) {
        return $q.when(publicId).then(function(id) {
          return spfFirebase.loadedObj(['singpath/userProfiles', id]);
        });
      },

      queuedSolutions: function(publicId) {
        return $q.when(publicId).then(function(id) {
          return spfFirebase.loadedObj(['singpath/userProfiles', id, 'queuedSolutions']);
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
        return spfFirebase.loadedObj(['singpath/paths']).then(function(paths) {
          return Object.keys(paths).reduce(function(all, id) {
            if (!id || id[0] === '$') {
              return all;
            }
            all[id] = {
              id: id,
              title: paths[id].title,
              url: [
                clmServicesUrl.singPath,
                '#/paths', id,
                'levels'
              ].join('/')
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
        return spfFirebase.loadedObj(['singpath/levels', pathId]).then(function(levels) {
          return Object.keys(levels).reduce(function(all, id) {
            if (!id || id[0] === '$') {
              return all;
            }
            all[id] = {
              id: id,
              title: levels[id].title,
              url: [
                clmServicesUrl.singPath,
                '#/paths', pathId,
                'levels', id,
                'problems'
              ].join('/')
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
        return spfFirebase.loadedObj(['singpath/problems', pathId, levelId]).then(function(problems) {
          return Object.keys(problems).reduce(function(all, id) {
            if (!id || id[0] === '$') {
              return all;
            }

            all[id] = {
              id: id,
              title: problems[id].title,
              url: [
                clmServicesUrl.singPath,
                '#/paths', pathId,
                'levels', levelId,
                'problems', id,
                'play'
              ].join('/')
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
        return spfFirebase.valueAt(['singpath/problems']);
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
  'routes',
  'spfFirebase',
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
