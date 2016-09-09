import {cleanObj} from 'singpath-core/services/firebase.js';

import clmProfileTmpl from './profiles-view-clm-profile.html!text';
import spfProfileTmpl from './profiles-view-spf-profile.html!text';
import ccLookupTmpl from './profiles-view-codecombat-lookup-error.html!text';
import editTmpl from './profiles-view-edit.html!text';
import showTmpl from './profiles-view-show.html!text';
import './profiles.css!';

const noop = () => undefined;
const TIMESTAMP = {'.sv': 'timestamp'};


export function configRoute($routeProvider, routes) {
  $routeProvider.when(routes.setProfileCodeCombatId, {
    template: ccLookupTmpl,
    controller: SetCodeCombatUserIdCtrl,
    controllerAs: 'ctrl',
    resolve: {initialData: setCodeCombatUserIdCtrlInitialData}
  })

  .when(routes.editProfile, {
    template: editTmpl,
    controller: ClmProfileCtrl,
    controllerAs: 'ctrl',
    resolve: {initialData: clmEditProfileInitialDataResolver}
  })

  .when(routes.profile, {
    template: showTmpl,
    controller: ClmProfileCtrl,
    controllerAs: 'ctrl',
    resolve: {initialData: clmShowProfileInitialDataResolver}
  });
}

configRoute.$inject = ['$routeProvider', 'routes'];

/**
 * Used to resolve `initialData` of `ClmProfileCtrl` the logged in user profile.
 *
 */
function clmEditProfileInitialDataResolver($q, spfAuth, spfAuthData, clmDataStore) {
  var profilePromise;
  var errLoggedOff = new Error('You need to be logged to edit her/his profile.');

  if (!spfAuth.user || !spfAuth.user.uid) {
    return $q.reject(errLoggedOff);
  }

  profilePromise = clmDataStore.currentUserProfile().then(function(profile) {
    if (profile && profile.$value === null) {
      return clmDataStore.initProfile();
    }

    return profile;
  });

  return $q.all({
    auth: spfAuth,
    currentUser: spfAuthData.user(),
    profile: profilePromise,
    currentUserProfile: profilePromise
  });
}
clmEditProfileInitialDataResolver.$inject = ['$q', 'spfAuth', 'spfAuthData', 'clmDataStore'];

/**
 * Used to resolve `initialData` of `ClmProfileCtrl` for a public profile.
 *
 */
function clmShowProfileInitialDataResolver($q, $route, spfAuth, spfAuthData, clmDataStore) {
  var publicId = $route.current.params.publicId;
  var profilePromise;
  var errNoPublicId = new Error('Unexpected error: the public id is missing');
  var errNoProfile = new Error(`Could not found the profile for ${publicId}`);

  if (!publicId) {
    return $q.reject(errNoPublicId);
  }

  profilePromise = clmDataStore.profile(publicId).then(function(profile) {
    if (profile.$value === null) {
      return $q.reject(errNoProfile);
    }
    return profile;
  });

  return $q.all({
    auth: spfAuth,
    currentUser: spfAuthData.user().catch(noop),
    currentUserProfile: clmDataStore.currentUserProfile(),
    profile: profilePromise
  });
}
clmShowProfileInitialDataResolver.$inject = ['$q', '$route', 'spfAuth', 'spfAuthData', 'clmDataStore'];

/**
 * ClmProfileCtrl
 *
 */
function ClmProfileCtrl(
  $q, $route, firebaseApp, spfAuthData, spfNavBarService, initialData, clmDataStore, spfAlert
) {
  var self = this;
  var menu = [];
  var db = firebaseApp.database();

  this.auth = initialData.auth;
  this.currentUser = initialData.currentUser;
  this.currentUserProfile = initialData.currentUserProfile;
  this.profile = initialData.profile;

  if (
    this.profile &&
    this.profile.$id &&
    this.currentUser &&
    this.currentUser.publicId === this.profile.$id
  ) {
    menu = [{
      title: 'Edit',
      onClick: function() {
        self.profileNeedsUpdate = true;
      },
      icon: 'create'
    }];
  }

  spfNavBarService.update('Profile', undefined, menu);

  this.settingPublicId = false;

  // this.profileNeedsUpdate = this.currentUser && !this.currentUser.$completed();
  this.profileNeedsUpdate = false;

  function cleanProfile(currentUser) {
    currentUser.country = cleanObj(currentUser.country);
    currentUser.school = cleanObj(currentUser.school);
  }

  this.goBack = function() {
    self.profileNeedsUpdate = false;
  };

  this.refreshAchievements = function(profileId) {
    var ref = db.ref('queue/tasks');

    // TODO: Only request updates if the user has registered for the service.
    console.log('Requesting achievement update ');

    ref.push({id: profileId, service: 'freeCodeCamp'});
    ref.push({id: profileId, service: 'pivotalExpert'});
    ref.push({id: profileId, service: 'codeCombat'});
    ref.push({id: profileId, service: 'codeSchool'});
  };

  function serviceDetailsUpdater(serviceId) {
    return function updateDetails(name) {
      var ref = db.ref(`classMentors/userProfiles/${self.profile.$id}/'services/${serviceId}/details`);

      console.log(`The new ${serviceId} username is ${username}`);

      return ref.update({id: username, name: username, registeredBefore: TIMESTAMP});
    };
  }

  function serviceDetailsRemover(serviceId) {
    return function removeDetails() {
      var ref = db.ref(`classMentors/userProfiles/${self.profile.$id}/'services/${serviceId}`);

      console.log(`Removing ${serviceId} from profile.`);

      return ref.remove();
    };
  }

  this.updateFreeCodeCampUsername = serviceDetailsUpdater('freeCodeCamp');
  this.removeFreeCodeCamp = serviceDetailsRemover('freeCodeCamp');

  this.updatePivotalExpertUsername = serviceDetailsUpdater('pivotalExpert');
  this.removePivotalExpert = serviceDetailsRemover('pivotalExpert');

  this.updateCodeCombatUsername = serviceDetailsUpdater('codeCombat');
  this.removeCodeCombat = serviceDetailsRemover('codeCombat');

  this.updateCodeSchoolUsername = serviceDetailsUpdater('codeSchool');
  this.removeCodeSchool = serviceDetailsRemover('codeSchool');

  this.setPublicId = function(currentUser) {
    var saved;

    this.settingPublicId = true;
    cleanProfile(currentUser);
    console.log(currentUser);

    if (!self.profile) {
      saved = spfAuthData.publicId(currentUser).then(function() {
        spfAlert.success('Public id and display name saved');
        return clmDataStore.initProfile();
      });
    } else {
      saved = currentUser.$save().then(function() {
        return clmDataStore.updateProfile(currentUser);
      });
    }

    return saved.then(function() {
      spfAlert.success('Profile setup.');
      return $route.reload();
    }).catch(function(err) {
      spfAlert.error('Failed to ');
      return $q.reject(err);
    }).finally(function() {
      self.settingPublicId = false;
    });
  };

  this.lookUp = {
    codeSchool: {
      id: undefined,

      save: function() {
        return clmDataStore.services.codeSchool.saveDetails(self.profile.$id, {
          id: self.lookUp.codeSchool.id,
          name: self.lookUp.codeSchool.id
        }).then(function() {
          spfAlert.success('Code School user name saved.');
          return clmDataStore.currentUserProfile();
        }).catch(function(err) {
          spfAlert.error('Failed to save Code School user name.');
          return $q.reject(err);
        }).then(function(profile) {
          self.profile = profile;
          return clmDataStore.services.codeSchool.updateProfile(profile);
        });
      }
    },

    codeCombat: {
      find: function() {
        clmDataStore.services.codeCombat.requestUserName();
      },

      save: function() {
        return $q.reject(new Error('Not implemented'));
      }
    }
  };
}

ClmProfileCtrl.$inject = [
  '$q', '$route', 'firebaseApp',
  'spfAuthData', 'spfNavBarService',
  'initialData', 'clmDataStore', 'spfAlert'
];

/**
 * Use to resolve `initialData` of `SetCodeCombatUserIdCtrl`.
 *
 */
function setCodeCombatUserIdCtrlInitialData($q, $location, routes, spfAlert, clmDataStore) {
  var search = $location.search();
  var verificationKey = search.id;
  var username = search.username;

  return clmDataStore.services.codeCombat.setUser(username, verificationKey).then(function() {
    spfAlert.success('Your Code Combat user name and id have been saved.');
    return clmDataStore.currentUserProfile();
  }).then(function(profile) {
    clmDataStore.services.codeCombat.updateProfile(profile);
  }).then(function() {
    $location.path(routes.editProfile);
  }).catch(function(err) {
    return {
      err: err,
      userName: username
    };
  });
}

setCodeCombatUserIdCtrlInitialData.$inject = [
  '$q',
  '$location',
  'routes',
  'spfAlert',
  'clmDataStore'
];

/**
 * SetCodeCombatUserIdCtrl
 *
 */
function SetCodeCombatUserIdCtrl(initialData, spfNavBarService) {
  this.err = initialData.err;
  this.userName = initialData.userName;

  spfNavBarService.update('Code Combat User Name');
}

SetCodeCombatUserIdCtrl.$inject = ['initialData', 'spfNavBarService'];

export function clmProfileFactory() {
  return {
    template: clmProfileTmpl,
    restrict: 'A',
    scope: {
      serviceId: '@clmServiceId',
      profile: '=clmProfile',
      currentUser: '=clmCurrentUser'
    },
    controller: [
      '$scope',
      '$log',
      'spfAuthData',
      'spfAlert',
      'clmDataStore',
      function ClmProfileCtrl($scope, $log, spfAuthData, spfAlert, clmDataStore) {
        this.services = {
          codeCombat: {
            name: 'Code Combat',
            url: 'http://codecombat.com/'
          },

          codeSchool: {
            name: 'Code School',
            url: 'https://www.codeschool.com/'
          },

          treehouse: {
            name: 'Treehouse',
            url: 'http://www.teamtreehouse.com/signup_code/singapore'
          }
        };

        this.canUpdate = function() {
          if (
            $scope.profile &&
            $scope.currentUser &&
            $scope.profile.$id === $scope.currentUser.$id
          ) {
            return true;
          }

          return (
            $scope.currentUser &&
            $scope.currentUser.user &&
            $scope.currentUser.user.isAdmin
          );
        };

        this.getLength = function(obj) {
          return Object.keys(obj).length;
        };

        this.canRemove = function() {
          return (
            $scope.profile &&
            $scope.currentUser &&
            $scope.profile.$id === $scope.currentUser.$id
          );
        };

        this.update = function() {
          return clmDataStore.services[$scope.serviceId].updateProfile(
            $scope.profile
          );
        };

        this.remove = function(serviceId, details) {
          if (
            !$scope.profile ||
            !details
          ) {
            return;
          }

          clmDataStore.services[serviceId].removeDetails($scope.profile.$id, details.id).catch(function(err) {
            $log.error(err);
            spfAlert.error('Failed to delete service data.');
          });
        };
      }
    ],
    controllerAs: 'ctrl',

    // arguments: scope, iElement, iAttrs, controller
    link: function clmProfilePostLink() {}
  };
}

clmProfileFactory.$inject = [];

/**
 * Controller for clmSpfProfile
 *
 * Expect publicId to be bound to ctrl using directive's `bindToController`
 * property.
 *
 */
function ClmSpfProfileCtrl($q, $log, clmDataStore, clmServicesUrl) {
  var self = this;

  this.loading = true;
  this.stats = {
    total: {},
    user: {}
  };
  this.singpathUrl = clmServicesUrl.singPath;

  // Count problems by language
  var total = clmDataStore.singPath.allProblems().then(function(paths) {
    return clmDataStore.singPath.countProblems(paths);
  });

  // Count solved problem by language
  var user = clmDataStore.singPath.profile(self.publicId).then(function(profile) {
    return clmDataStore.singPath.countSolvedSolutionPerLanguage(profile);
  });

  $q.all({total: total, user: user}).then(function(stats) {
    self.stats = stats;
    return stats;
  }).catch(function(err) {
    $log.error(err);
  }).finally(function() {
    self.loading = false;
  });
}

ClmSpfProfileCtrl.$inject = ['$q', '$log', 'clmDataStore', 'clmServicesUrl'];

export function clmSpfProfileFactory() {
  return {
    template: spfProfileTmpl,
    restrict: 'A',
    scope: {publicId: '=clmSpfProfile'},
    bindToController: true,
    controller: ClmSpfProfileCtrl,
    controllerAs: 'ctrl'
  };
}

clmSpfProfileFactory.$inject = [];

export function clmServiceUserIdExistsFactory($q, clmDataStore) {
  return {
    restrict: 'A',
    scope: false,
    require: 'ngModel',

    // arguments: scope, iElement, iAttrs, controller
    link: function clmServiceUserIdExistsPostLink(s, e, iAttrs, model) {
      var serviceId = iAttrs.clmServiceUserIdExists;

      if (!serviceId || !clmDataStore.services[serviceId]) {
        return;
      }

      model.$asyncValidators.clmServiceUserIdExists = function(modelValue, viewValue) {
        if (!viewValue) {
          return $q.when(true);
        }
        return clmDataStore.services[serviceId].userIdExist(viewValue).then(function(exists) {
          if (!exists) {
            return $q.reject(new Error(`${viewValue} does not exist or is not public`));
          }
          return true;
        });
      };
    }
  };
}

clmServiceUserIdExistsFactory.$inject = ['$q', 'clmDataStore'];
