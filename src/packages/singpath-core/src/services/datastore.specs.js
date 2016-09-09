import {testInjectMatch, sinon, expect} from 'singpath-core/tools/chai.js';

import * as datastore from './datastore.js';


describe('datastore service.', function() {

  describe('currentUser service', function() {
    const spfProfilesPath = 'classMentors/userProfiles';
    let
      currentUser,
      $q,
      db,
      authDb,
      $timeout,
      $log,
      $rootScope,
      spfCrypto,
      firebaseApp,
      authFirebaseApp,
      spfAuth,
      firebaseUser;

    testInjectMatch(datastore.SpfCurrentUserService);

    beforeEach(function() {
      $q = (resolve, reject) => new Promise(resolve, reject);
      $q.resolve = Promise.resolve;
      $q.reject = Promise.reject;

      $timeout = sinon.stub();
      $timeout.cancel = sinon.spy();

      $log = {error: sinon.spy()};

      $rootScope = {$emit: sinon.spy(), $on: sinon.stub(), $applyAsync: sinon.spy()};

      spfCrypto = {md5: sinon.stub()};

      db = {ref: sinon.stub()};
      firebaseApp = {database: sinon.stub()};
      firebaseApp.database.returns(db);

      authDb = {ref: sinon.stub()};
      authFirebaseApp = {database: sinon.stub()};
      authFirebaseApp.database.returns(authDb);

      spfAuth = {
        user: undefined,
        onAuth: sinon.stub(),
        login: sinon.stub(),
        logout: sinon.stub()
      };

      firebaseUser = {
        uid: 'google:bob',
        provider: 'google',
        google: {
          email: 'bob@example.com',
          displayName: 'bob smith'
        }
      };

      currentUser = new datastore.SpfCurrentUserService(
        $q, $timeout, $log, $rootScope, spfCrypto, firebaseApp, authFirebaseApp, spfAuth, spfProfilesPath
      );
    });

    it('should watch for auth change', function() {
      expect(spfAuth.onAuth).to.have.been.calledOnce();
      expect(spfAuth.onAuth).to.have.been.calledWith(sinon.match.func);
    });

    it('should set user and profile when the current user is logged off', function() {
      expect(currentUser.firebaseUser).to.be.null();
      expect(currentUser.user).to.be.null();
      expect(currentUser.profile).to.be.null();
    });

    describe('authChangedHandler', function() {
      let ref;

      beforeEach(function() {
        ref = {
          on: sinon.spy(),
          off: sinon.spy()
        };
        authDb.ref.withArgs('auth/users/google:bob').returns(ref);
        sinon.stub(currentUser, 'patchUser');
      });

      it('should be called when auth status changes', function() {
        const handler = spfAuth.onAuth.lastCall.args[0];

        sinon.stub(currentUser, 'authChangedHandler');
        handler();

        expect(currentUser.authChangedHandler).to.have.been.calledOnce();

        const status = {};

        handler(status);
        expect(currentUser.authChangedHandler).to.have.been.calledTwice();
        expect(currentUser.authChangedHandler).to.have.been.calledWith(status);
      });

      it('should set uid and firebaseUser property', function() {
        currentUser.authChangedHandler(firebaseUser);
        expect(currentUser.uid).to.equal(firebaseUser.uid);
        expect(currentUser.firebaseUser).to.equal(firebaseUser);

        expect($rootScope.$applyAsync).to.have.been.calledTwice();
        expect($rootScope.$emit).to.have.been.calledTwice();
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({firebaseUser: true})
        );
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({user: true})
        );
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({profile: true})
        );
      });

      it('should save the user data when he logs in', function() {
        spfCrypto.md5.withArgs('bob@example.com').returns('some-hash');

        currentUser.authChangedHandler(null);
        expect(currentUser.patchUser).to.not.have.been.called();

        currentUser.authChangedHandler(firebaseUser);
        expect(currentUser.patchUser).to.have.been.calledOnce();

        currentUser.authChangedHandler(firebaseUser);
        expect(currentUser.patchUser).to.have.been.calledTwice();

        currentUser.authChangedHandler(null);
        expect(currentUser.patchUser).to.have.been.calledTwice();
      });

      it('should watch user auth data record if the user is logged on', function() {
        currentUser.authChangedHandler(firebaseUser);

        expect(ref.on).to.have.been.calledOnce();
        expect(ref.on).to.have.been.calledWith('value', sinon.match.func, sinon.match.func);

        currentUser.authChangedHandler(firebaseUser);
        expect(ref.on).to.have.been.calledOnce();
      });

      it('should set $watchers.user', function() {
        currentUser.authChangedHandler(firebaseUser);
        expect(currentUser.$watchers.user).to.be.a('function');

        const handler = ref.on.lastCall.args[1];

        currentUser.$watchers.user();
        expect(ref.off).to.have.been.calledOnce();
        expect(ref.off).to.have.been.calledWith('value', handler);
      });

      it('should only start watching if the user was logged off', function() {
        currentUser.authChangedHandler(firebaseUser);
        currentUser.authChangedHandler(firebaseUser);
        expect(ref.on).to.have.been.calledOnce();
      });

      it('should reset user and profile when the user logs off', function() {
        const userOff = sinon.spy();
        const profileOff = sinon.spy();

        currentUser.user = {uid: 'google:bob', publicId: 'bob'};
        currentUser.profile = {};
        currentUser.$watchers.user = userOff;
        currentUser.$watchers.profile = profileOff;

        currentUser.authChangedHandler();

        expect(currentUser.user).to.be.null();
        expect(currentUser.profile).to.be.null();
        expect(userOff).to.have.been.called();
        expect(profileOff).to.have.been.called();
      });

      it('should reset user and profile when the user data watch fails', function() {
        currentUser.authChangedHandler(firebaseUser);

        const errorHandler = ref.on.lastCall.args[2];
        const userOff = sinon.spy();
        const profileOff = sinon.spy();

        currentUser.user = {uid: 'google:bob', publicId: 'bob'};
        currentUser.profile = {};
        currentUser.$watchers.user = userOff;
        currentUser.$watchers.profile = profileOff;

        errorHandler(new Error());

        expect(currentUser.user).to.be.null();
        expect(currentUser.profile).to.be.null();
        expect(userOff).to.have.been.called();
        expect(profileOff).to.have.been.called();
      });

    });

    describe('patchUser', function() {
      let userRef;

      beforeEach(function() {
        currentUser.firebaseUser = firebaseUser;
        userRef = {once: sinon.stub(), transaction: sinon.stub()};
        authDb.ref.withArgs('auth/users/google:bob').returns(userRef);
        userRef.once.withArgs('value').returns(Promise.resolve());
        userRef.transaction.withArgs(sinon.match.func).returns(Promise.resolve());
      });

      it('should fetch the user data first', function() {
        return currentUser.patchUser().then(() => {
          expect(userRef.once).to.have.been.calledOnce();
          expect(userRef.once).to.have.been.calledWith('value');
          expect(userRef.once).to.have.been.calledBefore(userRef.transaction);
        });
      });

      describe('update', function() {
        let handler;

        beforeEach(function() {
          spfCrypto.md5.withArgs('bob@example.com').returns('some-hash');
          spfCrypto.md5.withArgs('other@example.com').returns('some-other-hash');

          return currentUser.patchUser().then(() => {
            expect(userRef.transaction).to.have.been.calledOnce();
            expect(userRef.transaction).to.have.been.calledWith(sinon.match.func);
            handler = userRef.transaction.lastCall.args[0];
          });
        });

        it('should create the auth data record if it does not exist', function() {
          expect(handler(null)).to.eql({
            id: 'google:bob',
            fullName: 'bob smith',
            displayName: 'bob smith',
            email: 'bob@example.com',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            createdAt: {'.sv': 'timestamp'}
          });
        });

        it('should only update the record if the user is still logged in', function() {
          currentUser.firebaseUser = null;
          expect(handler(null)).to.be.undefined();
        });

        it('should not update the record if it is unchanged', function() {
          const user = {
            id: 'google:bob',
            fullName: 'bob smith',
            displayName: 'bob smith',
            email: 'bob@example.com',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            createdAt: 1234567
          };

          expect(handler(user)).to.be.undefined();
        });

        it('should update the user data when he logs with a new email', function() {
          const user = {
            id: 'google:bob',
            fullName: 'bob smith',
            displayName: 'bob smith',
            email: 'bob@example.com',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            createdAt: 1234567
          };

          currentUser.firebaseUser.google.email = 'other@example.com';

          expect(handler(user)).to.eql({
            id: 'google:bob',
            fullName: 'bob smith',
            displayName: 'bob smith',
            email: 'other@example.com',
            gravatar: '//www.gravatar.com/avatar/some-other-hash',
            createdAt: 1234567
          });
        });

        it('should update the user data when he logs in (2/2)', function() {
          const user = {
            id: 'google:bob',
            fullName: 'bob smith',
            displayName: 'bob smith',
            email: 'bob@example.com',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            createdAt: {'.sv': 'timestamp'}
          };

          currentUser.firebaseUser.google.displayName += ' First of His Name';

          expect(handler(user)).to.eql({
            id: 'google:bob',
            fullName: 'bob smith First of His Name',
            displayName: 'bob smith',
            email: 'bob@example.com',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            createdAt: {'.sv': 'timestamp'}
          });
        });

      });

    });

    describe('userChangedHandler', function() {
      const publicId = 'bob';
      let user, profileRef, profileDetailsRef;

      beforeEach(function() {
        currentUser.user = undefined;
        currentUser.profile = undefined;
        sinon.stub(currentUser, 'patchProfile');

        user = {
          id: 'google:bob',
          fullName: 'bob smith',
          displayName: 'bob smith',
          email: 'bob@example.com',
          gravatar: '//www.gravatar.com/avatar/some-hash',
          createdAt: {'.sv': 'timestamp'}
        };

        profileRef = {child: sinon.stub()};
        profileDetailsRef = {
          on: sinon.spy(),
          off: sinon.spy()
        };
        db.ref.withArgs('classMentors/userProfiles/bob').returns(profileRef);
        profileRef.child.withArgs('user').returns(profileDetailsRef);
      });

      it('should be used to monitor user data changes', function() {
        const userRef = {
          on: sinon.spy(),
          off: sinon.spy()
        };

        authDb.ref.withArgs('auth/users/google:bob').returns(userRef);
        sinon.stub(currentUser, 'patchUser');
        sinon.stub(currentUser, 'userChangedHandler');

        currentUser.authChangedHandler(firebaseUser);

        const handler = userRef.on.lastCall.args[1];
        const snapshot = {val: sinon.stub()};

        snapshot.val.returns(null);
        handler(snapshot);

        expect(currentUser.userChangedHandler).to.have.been.calledOnce();
        expect(currentUser.userChangedHandler).to.have.been.calledWith(null);

        const val = {};

        snapshot.val.returns(val);
        handler(snapshot);

        expect(currentUser.userChangedHandler).to.have.been.calledTwice();
        expect(currentUser.userChangedHandler).to.have.been.calledWith(val);
      });

      it('should update publicId and user properties', function() {
        currentUser.userChangedHandler(null);
        expect(currentUser.user).to.be.null();
        expect(currentUser.publicId).to.be.null();
        expect($rootScope.$applyAsync).to.have.been.calledOnce();
        expect($rootScope.$emit).to.have.been.calledTwice();
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({user: true})
        );
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({profile: true})
        );

        $rootScope.$applyAsync.reset();
        $rootScope.$emit.reset();
        currentUser.userChangedHandler(user);
        expect(currentUser.publicId).to.be.null();
        expect(currentUser.user).to.equal(user);
        expect($rootScope.$applyAsync).to.have.been.calledOnce();
        expect($rootScope.$emit).to.have.been.calledTwice();
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({user: true})
        );
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({profile: true})
        );

        $rootScope.$applyAsync.reset();
        $rootScope.$emit.reset();
        user.publicId = 'bob';
        currentUser.userChangedHandler(user);
        expect(currentUser.publicId).to.equal('bob');
        expect($rootScope.$applyAsync).to.have.been.calledTwice();
        expect($rootScope.$emit).to.have.been.calledTwice();
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({user: true})
        );
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({profile: true})
        );

        $rootScope.$applyAsync.reset();
        $rootScope.$emit.reset();
        currentUser.userChangedHandler(user);
        expect($rootScope.$applyAsync).to.have.been.calledOnce();
        expect($rootScope.$emit).to.have.been.calledOnce();
        expect($rootScope.$emit).to.have.been.calledWith(
          datastore.eventName, sinon.match({user: true})
        );
        expect($rootScope.$emit).to.not.have.been.calledWith(
          datastore.eventName, sinon.match({profile: true})
        );
      });

      it('should set profile property to null (not loading) when the user are not saved yet', function() {
        currentUser.userChangedHandler(null);
        expect(currentUser.profile).to.be.null();
      });

      it('should set profile property to null when the user is not registered (no public id)', function() {
        delete user.publicId;

        currentUser.userChangedHandler(user);
        expect(currentUser.profile).to.be.null();
      });

      it('should patch the profile if the user is registered', function() {
        currentUser.userChangedHandler(user);
        expect(currentUser.patchProfile).to.not.have.been.called();

        user.publicId = 'bob';
        currentUser.userChangedHandler(user);
        expect(currentUser.patchProfile).to.have.been.calledOnce();
      });

      it('should watch profile changes if the user is registered', function() {
        user.publicId = publicId;
        currentUser.userChangedHandler(user);

        expect(profileDetailsRef.on).to.have.been.calledOnce();
      });

      it('should only start the watch if the user just logged in', function() {
        user.publicId = publicId;
        currentUser.userChangedHandler(user);
        expect(profileDetailsRef.on).to.have.been.calledOnce();

        user.displayName = 'bob';
        currentUser.userChangedHandler(user);
        expect(profileDetailsRef.on).to.have.been.calledOnce();
      });

      it('should set $watchers.profile', function() {
        user.publicId = publicId;
        currentUser.userChangedHandler(user);
        expect(currentUser.$watchers.profile).to.be.a('function');

        const handler = profileDetailsRef.on.lastCall.args[1];

        currentUser.$watchers.profile();
        expect(profileDetailsRef.off).to.have.been.calledOnce();
        expect(profileDetailsRef.off).to.have.been.calledWith('value', handler);
      });

      it('should reset profile when the profile details watch fails', function() {
        user.publicId = publicId;
        currentUser.userChangedHandler(user);

        const errorHandler = profileDetailsRef.on.lastCall.args[2];
        const userOff = sinon.spy();
        const profileOff = sinon.spy();
        const userDetails = {uid: 'google:bob', publicId: 'bob'};

        currentUser.user = userDetails;
        currentUser.profile = {};
        currentUser.$watchers.user = userOff;
        currentUser.$watchers.profile = profileOff;

        errorHandler(new Error());

        expect(currentUser.user).to.equal(userDetails);
        expect(currentUser.profile).to.be.null();
        expect(userOff).to.not.have.been.called();
        expect(profileOff).to.have.been.called();
      });

    });

    describe('patchProfile', function() {
      let detailsRef;

      beforeEach(function() {
        const profileRef = {child: sinon.stub()};

        detailsRef = {once: sinon.stub(), transaction: sinon.stub()};
        profileRef.child.withArgs('user').returns(detailsRef);
        db.ref.withArgs('classMentors/userProfiles/bob').returns(profileRef);
        detailsRef.once.withArgs('value').returns(Promise.resolve());
        detailsRef.transaction.withArgs(sinon.match.func).returns(Promise.resolve());

        currentUser.publicId = 'bob';
        currentUser.user = {
          id: 'google:bob',
          publicId: 'bob',
          fullName: 'bob smith',
          displayName: 'bob smith',
          email: 'bob@example.com',
          gravatar: '//www.gravatar.com/avatar/some-hash',
          createdAt: {'.sv': 'timestamp'}
        };
      });

      it('should fetch the user data first', function() {
        return currentUser.patchProfile().then(() => {
          expect(detailsRef.once).to.have.been.calledOnce();
          expect(detailsRef.once).to.have.been.calledWith('value');
          expect(detailsRef.once).to.have.been.calledBefore(detailsRef.transaction);
        });
      });

      describe('update', function() {
        let handler;

        beforeEach(function() {
          return currentUser.patchProfile().then(() => {
            expect(detailsRef.transaction).to.have.been.calledOnce();
            expect(detailsRef.transaction).to.have.been.calledWith(sinon.match.func);
            handler = detailsRef.transaction.lastCall.args[0];
          });
        });

        it('should create the user profile if he user has just registered', function() {
          expect(handler(null)).to.eql({
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            yearOfBirth: null,
            school: null,
            country: null
          });
        });

        it('should update the user profile if he user has new auth data (1/3)', function() {
          const profile = {
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash'
          };

          currentUser.user.country = {name: 'United Kingdom', code: 'GB'};

          expect(handler(profile)).to.eql({
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            yearOfBirth: null,
            school: null,
            country: {name: 'United Kingdom', code: 'GB'}
          });
        });

        it('should update the user profile if he user has new auth data (2/3)', function() {
          const profile = {
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            country: {name: 'United Kingdom', code: 'GB'}
          };

          currentUser.user.country = {name: 'France', code: 'FR'};

          expect(handler(profile)).to.eql({
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            yearOfBirth: null,
            school: null,
            country: {name: 'France', code: 'FR'}
          });
        });

        it('should update the user profile if he user has new auth data (3/3)', function() {
          const profile = {
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            school: {
              iconUrl: '/assets/crests/tempbadge.png',
              id: 'Admiralty Secondary School',
              name: 'Admiralty Secondary School',
              type: 'Secondary'
            }
          };

          currentUser.user.school = {
            id: 'Admiralty Secondary School',
            name: 'Admiralty Secondary School',
            type: 'Secondary'
          };

          expect(handler(profile)).to.eql({
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash',
            yearOfBirth: null,
            school: {
              id: 'Admiralty Secondary School',
              name: 'Admiralty Secondary School',
              type: 'Secondary'
            },
            country: null
          });
        });

        it('should not update the user profile if the auth data are unchanged', function() {
          const profile = {
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash'
          };

          expect(handler(profile)).to.be.undefined();
        });

        it('should not update the user profile if auth data get lost', function() {
          const profile = {
            displayName: 'bob smith',
            gravatar: '//www.gravatar.com/avatar/some-hash'
          };

          currentUser.user = null;
          expect(handler(profile)).to.be.undefined();
        });

      });
    });

    describe('profileChangedHandler', function() {

      it('should be used to monitor profile changes', function() {
        const user = {
          id: 'google:bob',
          publicId: 'bob',
          fullName: 'bob smith',
          displayName: 'bob smith',
          email: 'bob@example.com',
          gravatar: '//www.gravatar.com/avatar/some-hash',
          createdAt: {'.sv': 'timestamp'}
        };
        const profileRef = {child: sinon.stub()};
        const profileDetailsRef = {
          on: sinon.spy(),
          once: sinon.stub(),
          transaction: sinon.spy()
        };

        db.ref.withArgs('classMentors/userProfiles/bob').returns(profileRef);
        profileDetailsRef.once.withArgs('value').returns(Promise.resolve());
        profileRef.child.withArgs('user').returns(profileDetailsRef);
        sinon.stub(currentUser, 'profileChangedHandler');

        currentUser.userChangedHandler(user);

        const snapshot = {val: sinon.stub()};
        const handler = profileDetailsRef.on.lastCall.args[1];

        snapshot.val.returns(null);
        handler(snapshot);
        expect(currentUser.profileChangedHandler).to.have.been.calledOnce();
        expect(currentUser.profileChangedHandler).to.have.been.calledWith(null);

        const profile = {};

        snapshot.val.returns(profile);
        handler(snapshot);
        expect(currentUser.profileChangedHandler).to.have.been.calledTwice();
        expect(currentUser.profileChangedHandler).to.have.been.calledWith(profile);
      });

      it('should update isAdmin, isPremium && profile properties', function() {
        currentUser.profile = undefined;
        currentUser.profileChangedHandler(null);
        expect(currentUser.isAdmin).to.be.false();
        expect(currentUser.isPremium).to.be.false();
        expect(currentUser.profile).to.be.null();

        const profile = {};

        currentUser.profileChangedHandler(profile);
        expect(currentUser.profile).to.equal(profile);
        expect(currentUser.isAdmin).to.be.false();
        expect(currentUser.isPremium).to.be.false();

        profile.isAdmin = true;
        profile.isPremium = true;
        currentUser.profileChangedHandler(profile);
        expect(currentUser.profile).to.equal(profile);
        expect(currentUser.isAdmin).to.be.true();
        expect(currentUser.isPremium).to.be.true();
      });

    });

    describe('userRef', function() {
      let ref;

      beforeEach(function() {
        authDb.ref.returns(ref);
      });

      it('should return a firebase reference to a user auth data', function() {
        expect(currentUser.userRef('google:bob')).to.equal(ref);
        expect(authDb.ref).to.have.been.calledWith('auth/users/google:bob');

        expect(currentUser.userRef('google:alice')).to.equal(ref);
        expect(authDb.ref).to.have.been.calledWith('auth/users/google:alice');
      });

      it('should throw if uid is not provided', function() {
        expect(() => currentUser.userRef('')).to.throw();
        expect(() => currentUser.userRef()).to.throw();
      });

    });

    describe('profileRef', function() {
      let ref;

      beforeEach(function() {
        db.ref.returns(ref);
      });

      it('should return a firebase reference to a user auth data', function() {
        expect(currentUser.profileRef('bob')).to.equal(ref);
        expect(db.ref).to.have.been.calledWith('classMentors/userProfiles/bob');

        expect(currentUser.profileRef('alice')).to.equal(ref);
        expect(db.ref).to.have.been.calledWith('classMentors/userProfiles/alice');
      });

      it('should throw if uid is not provided', function() {
        expect(() => currentUser.profileRef('')).to.throw();
        expect(() => currentUser.profileRef()).to.throw();
      });

    });

    describe('watchUser', function() {
      let ref;

      beforeEach(function() {
        ref = {on: sinon.stub(), off: sinon.spy()};

        currentUser.firebaseUser = {uid: 'bob'};
        authDb.ref.returns(ref);
        currentUser.watchUser();

        ref.on.reset();
        ref.off.reset();
      });

      it('should reset user if the user is not logged in', function() {
        currentUser.firebaseUser = null;
        currentUser.user = undefined;
        currentUser.watchUser();
        expect(currentUser.user).to.be.null();
        expect(ref.on).to.not.have.been.called();
      });

    });

    describe('watchProfile', function() {
      let ref;

      beforeEach(function() {
        ref = {on: sinon.stub(), off: sinon.spy(), child: sinon.stub().returnsThis()};

        currentUser.user = {uid: 'google:bob', publicId: 'bob'};
        db.ref.returns(ref);
        currentUser.watchProfile();

        ref.on.reset();
        ref.off.reset();
      });

      it('should reset user if the user data are not saved', function() {
        currentUser.user = null;
        currentUser.profile = undefined;
        currentUser.watchProfile();
        expect(currentUser.user).to.be.null();
        expect(ref.on).to.not.have.been.called();
      });

    });

    describe('info', function() {

      beforeEach(function() {
        currentUser.firebaseUser = {
          uid: 'google:bob',
          provider: 'google',
          google: {
            displayName: 'bob smith',
            email: 'bob@example.com'
          }
        };
      });

      it('should return name and email if user logged on with google provider', function() {
        expect(currentUser.info()).to.eql({
          name: 'bob smith',
          email: 'bob@example.com'
        });
      });

      it('should mock name and email with custom provider', function() {
        delete currentUser.firebaseUser.google;
        currentUser.firebaseUser.provider = 'custom';
        expect(currentUser.info()).to.have.property('email');
        expect(currentUser.info()).to.have.property('name');
      });

      it('should throw if the user is logned in with an unknown provider', function() {
        delete currentUser.firebaseUser.google;
        currentUser.firebaseUser.provider = 'facebook';
        expect(() => currentUser.info()).to.throw();
      });
    });

    describe('$watch', function() {
      let deregister;

      beforeEach(function() {
        deregister = sinon.spy();
        $rootScope.$on.withArgs(datastore.eventName, sinon.match.func).returns(deregister);
      });

      it('should register', function() {
        const handler = () => undefined;

        currentUser.$watch(handler);
        expect($rootScope.$on).to.have.been.calledOnce();
        expect($rootScope.$on).to.have.been.calledWith(datastore.eventName, handler);
      });

      it('should return a deregistered function', function() {
        expect(currentUser.$watch(()=> undefined)).to.equal(deregister);
      });

    });

    describe('login', function() {

      it('should login current user', function() {
        currentUser.login();
        expect(spfAuth.login).to.have.been.calledOnce();
      });

    });

    describe('logout', function() {

      it('should logout current user', function() {
        currentUser.logout();
        expect(spfAuth.logout).to.have.been.calledOnce();
      });

    });

    describe('register', function() {
      const publicId = 'bob';
      const displayName = 'bobby';
      let ref;

      beforeEach(function() {
        ref = {update: sinon.stub()};
        ref.update.returns(Promise.resolve());
        authDb.ref.withArgs('auth').returns(ref);

        currentUser.firebaseUser = firebaseUser;
        currentUser.uid = firebaseUser.uid;
        currentUser.user = {};
      });

      it('should reject if the user is not logged in', function() {
        currentUser.firebaseUser = null;
        currentUser.uid = null;

        return currentUser.register({publicId, displayName}).then(
          () => new Error('unexpected'),
          () => undefined
        );
      });

      it('should reject if the user is already registered', function() {
        currentUser.user.publicId = publicId;
        currentUser.publicId = publicId;

        return currentUser.register({publicId, displayName}).then(
          () => new Error('unexpected'),
          () => undefined
        );
      });

      it('should reject if public id is not provided', function() {
        return currentUser.register({displayName}).then(
          () => new Error('unexpected'),
          () => undefined
        );
      });

      it('should patch auth with public id', function() {
        return currentUser.register({publicId: 'bob'}).then(() => {
          expect(ref.update).to.have.been.calledOnce();
          expect(ref.update).to.have.been.calledWith(sinon.match({
            'publicIds/bob': firebaseUser.uid,
            'usedPublicIds/bob': true,
            'users/google:bob/publicId': 'bob'
          }));
        });
      });

      it('should patch auth with public id and display name', function() {
        return currentUser.register({publicId: 'bob', displayName: 'bobby'}).then(() => {
          expect(ref.update).to.have.been.calledOnce();
          expect(ref.update).to.have.been.calledWith(sinon.match({
            'publicIds/bob': firebaseUser.uid,
            'usedPublicIds/bob': true,
            'users/google:bob/publicId': 'bob',
            'users/google:bob/displayName': 'bobby'
          }));
        });
      });

    });

    describe('$loaded', function() {
      let stop, timer;

      beforeEach(function() {
        stop = sinon.spy();
        timer = sinon.spy();
        $rootScope.$on.returns(stop);
        $timeout.returns(timer);

        currentUser.user = undefined;
        currentUser.profile = undefined;
      });

      it('should resolve immediatly if the currentUser state is stable', function() {
        currentUser.user = null;
        currentUser.profile = null;

        return currentUser.$loaded();
      });

      it('should reject when timing out', function() {
        const promise = currentUser.$loaded();

        expect($timeout).to.have.been.calledOnce();
        expect($timeout).to.have.been.calledWith(sinon.match.func, 2000);

        const timerHandler = $timeout.lastCall.args[0];

        timerHandler();

        return promise.then(
          () => Promise.reject(new Error('unexpected')),
          () => expect(stop).to.have.been.calledOnce()
        );
      });

      it('should accept the timing out delay', function() {
        currentUser.$loaded(10);

        expect($timeout).to.have.been.calledOnce();
        expect($timeout).to.have.been.calledWith(sinon.match.func, 10);

        const timerHandler = $timeout.lastCall.args[0];

        timerHandler();
      });

      it('should resolve when the state stabilise', function() {
        const promise = currentUser.$loaded();

        expect($rootScope.$on).to.have.been.calledOnce();
        expect($rootScope.$on).to.have.been.calledWith(datastore.eventName, sinon.match.func);

        const updateHandler = $rootScope.$on.lastCall.args[1];

        updateHandler();
        currentUser.user = null;
        currentUser.profile = null;
        updateHandler();

        return promise.then(() => {
          expect(stop).to.have.been.calledOnce();
          expect($timeout.cancel).to.have.been.calledOnce();
          expect($timeout.cancel).to.have.been.calledWith(timer);
        });
      });

    });

  });

  describe('run', function() {
    let $log;

    testInjectMatch(datastore.run);

    beforeEach(function() {
      $log = {info: sinon.spy()};
    });

    it('should throw if spfProfilesPath is not set', function() {
      expect(() => datastore.run($log, null)).to.throw();
    });

    it('should not throw if spfProfilesPath is set', function() {
      expect(() => datastore.run($log, 'some/path')).to.not.throw();
    });

    it('should log spfProfilesPath', function() {
      datastore.run($log, 'some/path');
      expect($log.info).to.have.been.calledOnce();
      expect($log.info).to.have.been.calledWith(sinon.match(/some\/path/));
    });

  });

  describe('spfAuth', function() {
    let spfAuth, firebaseAuth, $auth, currentUser, $route, $log, $firebaseAuth, authFirebaseApp, authProvider;

    beforeEach(function() {
      currentUser = {};
      firebaseAuth = {};
      $auth = {
        $getAuth: sinon.stub(),
        $signInWithPopup: sinon.stub(),
        $signOut: sinon.stub(),
        $onAuthStateChanged: sinon.stub()
      };
      $auth.$getAuth.returns(currentUser);
      $route = {reload: sinon.spy()};
      $log = {error: sinon.spy(), debug: sinon.spy()};
      authFirebaseApp = {auth: sinon.stub()};
      authFirebaseApp.auth.returns(firebaseAuth);
      $firebaseAuth = sinon.stub();
      $firebaseAuth.withArgs(firebaseAuth).returns($auth);
      authProvider = {};
      spfAuth = datastore.spfAuthFactory($route, $log, $firebaseAuth, authFirebaseApp, authProvider);
    });

    testInjectMatch(datastore.spfAuthFactory);

    it('should set current user state', function() {
      expect(spfAuth.user).to.equal(currentUser);
    });

    it('should update current user on state changes', function() {
      expect($auth.$onAuthStateChanged).to.have.been.calledOnce();
      expect($auth.$onAuthStateChanged).to.have.been.calledWith(sinon.match.func);

      const handler = $auth.$onAuthStateChanged.lastCall.args[0];
      const newState = {};

      handler(newState);
      expect(spfAuth.user).to.equal(newState);
      handler();
      expect(spfAuth.user).to.be.undefined();
    });

    describe('userInfo', function() {
      let googleData, customData;

      beforeEach(function() {
        googleData = {
          displayName: 'Bob Smith',
          email: 'bob@example.com',
          photoURL: 'https://example.com',
          providerId: 'google.com',
          uid: '1234567'
        };
        customData = {providerId: 'custom'};
      });

      it('should return null if the user is not logged in', function() {
        spfAuth.user = null;
        expect(spfAuth.userInfo()).to.equal(null);
      });

      it('should return an empty object if the firebase auth data have no providerData', function() {
        spfAuth.user = {};
        expect(spfAuth.userInfo()).to.eql({});
      });

      it('should return name and email from google provided data', function() {
        spfAuth.user = {providerData: [googleData]};
        expect(spfAuth.userInfo()).to.eql({
          name: googleData.displayName,
          email: googleData.email
        });
      });

      it('should return dummy name and email from custom provided data', function() {
        spfAuth.user = {providerData: [customData]};
        expect(spfAuth.userInfo()).to.eql({
          name: 'Custom User',
          email: 'custom@example.com'
        });
      });

      it('should not return dummy name and email from custom provided data if other data exist', function() {
        spfAuth.user = {providerData: [googleData, customData]};
        expect(spfAuth.userInfo()).to.eql({
          name: googleData.displayName,
          email: googleData.email
        });
        spfAuth.user = {providerData: [customData, googleData]};
        expect(spfAuth.userInfo()).to.eql({
          name: googleData.displayName,
          email: googleData.email
        });
      });

      it('should log unknown provider', function() {
        spfAuth.user = {providerData: [{providerId: 'unknown'}]};
        spfAuth.userInfo();
        expect($log.error).to.have.been.calledOnce();
      });

    });

    describe('login', function() {
      let credentials;

      beforeEach(function() {
        credentials = {user: currentUser, credential: {}};
        $auth.$signInWithPopup.withArgs(authProvider).returns(Promise.resolve(credentials));
      });

      it('should start popup signin process', function() {
        spfAuth.login();
        expect($auth.$signInWithPopup).to.have.been.calledOnce();
      });

      it('should resolve to the current user data', function() {
        return spfAuth.login().then(
          d => expect(d).to.equal(currentUser)
        );
      });

    });

    describe('logout', function() {
      let status;

      beforeEach(function() {
        status = {};
        $auth.$signOut.returns(Promise.resolve(status));
      });

      it('should sign user out', function() {
        spfAuth.logout();
        expect($auth.$signOut).to.have.been.calledOnce();
      });

      it('should return the resolve when the user is signed out', function() {
        return spfAuth.logout().then(
          s => expect(s).to.equal(status)
        );
      });
    });

  });

  describe('spfAuthData', function() {
    let spfAuthData, UserObject, db, $q, $log, $firebaseObject, authFirebaseApp, spfAuth, spfCrypto;

    beforeEach(function() {
      $q = (resolve, reject) => new Promise(resolve, reject);
      $q.resolve = v => Promise.resolve(v);
      $q.reject = e => Promise.reject(e);
      $log = {info: sinon.spy()};
      UserObject = sinon.stub();
      $firebaseObject = {$extend: sinon.stub()};
      $firebaseObject.$extend.returns(UserObject);
      db = {ref: sinon.stub()};
      authFirebaseApp = {database: sinon.stub()};
      authFirebaseApp.database.returns(db);
      spfAuth = {
        user: undefined,
        onAuth: sinon.stub(),
        userInfo: sinon.stub()
      };
      spfCrypto = {md5: sinon.stub()};
      spfAuthData = datastore.spfAuthDataFactory($q, $log, $firebaseObject, authFirebaseApp, spfAuth, spfCrypto);
    });

    testInjectMatch(datastore.spfAuthDataFactory);

    describe('UserFirebaseObject', function() {

      it('should extend angularFire $firebaseObject', function() {
        expect($firebaseObject.$extend).to.have.been.calledOnce();
        expect($firebaseObject.$extend).to.have.been.calledWith(sinon.match({}));
        expect(spfAuthData.UserFirebaseObject).to.equal(UserObject);
      });

      it('should include a $completed method', function() {
        expect($firebaseObject.$extend).to.have.been.calledWith(
          sinon.match({$completed: sinon.match.func})
        );
      });

      describe('$completed', function() {
        let mixin, singapore, uk, publicId, school;

        beforeEach(function() {
          mixin = $firebaseObject.$extend.lastCall.args[0];
          singapore = {name: 'Singapore', code: 'SG'};
          uk = {name: 'United Kingdom', code: 'GB'};
          publicId = 'bob';
          school = {
            id: 'Temasek Polytechnic',
            name: 'Temasek Polytechnic',
            type: 'Polytechnic'
          };
        });

        it('should check user has a public id and a country', function() {
          expect(mixin.$completed.call({})).to.be.false();
          expect(mixin.$completed.call({publicId})).to.be.false();
          expect(mixin.$completed.call({country: uk})).to.be.false();
          expect(mixin.$completed.call({publicId, country: uk})).to.be.true();
        });

        it('should check user has dob selected when from singapore', function() {
          const country = singapore;

          expect(mixin.$completed.call({publicId, country})).to.be.false();
          expect(mixin.$completed.call({publicId, country, yearOfBirth: 1990})).to.be.true();
        });

        it('should check user has school selected when from singapore and age range', function() {
          const country = singapore;
          const max = 1996;
          const min = 2004;

          expect(mixin.$completed.call({publicId, country, yearOfBirth: max - 1})).to.be.true();
          expect(mixin.$completed.call({publicId, country, yearOfBirth: max})).to.be.false();
          expect(mixin.$completed.call({publicId, country, yearOfBirth: min})).to.be.false();
          expect(mixin.$completed.call({publicId, country, yearOfBirth: min + 1})).to.be.true();
          expect(mixin.$completed.call({publicId, country, school, yearOfBirth: min})).to.be.true();
        });

      });

      describe('create', function() {

        it('should create a new UserFirebaseObject', function() {
          const ref = {child: () => undefined};
          const obj = spfAuthData.UserFirebaseObject.create(ref);

          expect(spfAuthData.UserFirebaseObject).to.have.been.calledOnce();
          expect(spfAuthData.UserFirebaseObject.lastCall.thisValue).to.equal(obj);
        });

        it('should throw if passed a string', function() {
          expect(() => spfAuthData.UserFirebaseObject.create('foo/bar')).to.throw(Error);
        });

        it('should throw if passed an array', function() {
          expect(() => spfAuthData.UserFirebaseObject.create(['foo', 'bar'])).to.throw(Error);
        });

      });

    });

    describe('register', function() {
      const uid = 'google:12345';
      const hash = 'some-hash';
      let userObj, info;

      beforeEach(function() {
        info = {name: 'bob smith', email: 'bob@example.com'};
        userObj = {
          $value: null,
          $save: sinon.stub()
        };
        userObj.$save.returns(Promise.resolve());
        spfAuth.user = {uid: uid};
        spfAuth.userInfo.returns(info);
        spfCrypto.md5.withArgs(info.email).returns(hash);
      });

      it('should reject without a UserObject', function() {
        return spfAuthData.register().then(
          () => Promise.reject(new Error('unexpected')),
          () => undefined
        );
      });

      it('should not save the object if it reference an existing value', function() {
        delete userObj.$value;

        return spfAuthData.register(userObj).then(uo => {
          expect(uo).to.equal(userObj);
          expect(userObj.$save).not.to.have.been.called();
        });
      });

      it('should reject if the user has no auth provided data', function() {
        spfAuth.userInfo.returns(null);

        return spfAuthData.register(userObj).then(
          () => Promise.reject(new Error('unexpected')),
          () => undefined
        );
      });

      it('should reject if the user auth provided data has no name', function() {
        delete info.name;

        return spfAuthData.register(userObj).then(
          () => Promise.reject(new Error('unexpected')),
          () => undefined
        );
      });

      it('should reject if the user auth provided data has no email', function() {
        delete info.email;

        return spfAuthData.register(userObj).then(
          () => Promise.reject(new Error('unexpected')),
          () => undefined
        );
      });

      it('should save the auth provided data', function() {
        return spfAuthData.register(userObj).then(uo => {
          expect(uo).to.equal(userObj);
          expect(userObj.$save).to.have.been.calledOnce();
          expect(uo.$value).to.eql({
            id: uid,
            fullName: info.name,
            displayName: info.name,
            email: info.email,
            gravatar: `//www.gravatar.com/avatar/${hash}`,
            createdAt: {'.sv': 'timestamp'}
          });
        });
      });

    });

    describe('user', function() {
      const uid = 'google:12345';
      let userDataRef, userObj;

      beforeEach(function() {
        spfAuth.user = {uid};

        userDataRef = {};
        db.ref.withArgs(`auth/users/${uid}`).returns(userDataRef);

        userObj = {$loaded: sinon.stub()};
        userObj.$loaded.returns(Promise.resolve(userObj));
        sinon.stub(spfAuthData.UserFirebaseObject, 'create');
        spfAuthData.UserFirebaseObject.create.withArgs(userDataRef).returns(userObj);

        sinon.stub(spfAuthData, 'register');
        spfAuthData.register.withArgs(userObj).returns(Promise.resolve(userObj));
      });

      it('should reject if the user is not logged in (1/2)', function() {
        spfAuth.user = undefined;

        return spfAuthData.user().then(
          () => Promise.reject(new Error('unexpected')),
          () => undefined
        );
      });

      it('should reject if the user is not logged in (2/2)', function() {
        spfAuth.user = {};

        return spfAuthData.user().then(
          () => Promise.reject(new Error('unexpected')),
          () => undefined
        );
      });

      it('should load the user data from the firebase app datastore', function() {
        return spfAuthData.user().then(
          uo => expect(uo).to.equal(userObj)
        );
      });

      it('should try to register the user', function() {
        return spfAuthData.user().then(
          () => expect(spfAuthData.register).to.have.been.calledOnce()
        );
      });

      it('should cache the user synchronized object', function() {
        return spfAuthData.user().then(
          () => spfAuthData.user()
        ).then(
          uo => expect(uo).to.equal(userObj)
        ).then(
          () => expect(spfAuthData.UserFirebaseObject.create).have.been.calledOnce()
        );
      });

      it('should reset the cache when the user signout', function() {
        expect(spfAuth.onAuth).to.have.been.calledOnce();
        expect(spfAuth.onAuth).to.have.been.calledWith(sinon.match.func);

        const handler = spfAuth.onAuth.lastCall.args[0];

        return spfAuthData.user().then(() => {
          handler();
        }).then(
          () => spfAuthData.user()
        ).then(
          uo => expect(uo).to.equal(userObj)
        ).then(
          () => expect(spfAuthData.UserFirebaseObject.create).have.been.calledTwice()
        );
      });

      it('should not reset the cache for other auth changes (TODO: multi provider provider support?)', function() {
        expect(spfAuth.onAuth).to.have.been.calledOnce();
        expect(spfAuth.onAuth).to.have.been.calledWith(sinon.match.func);

        const handler = spfAuth.onAuth.lastCall.args[0];

        return spfAuthData.user().then(() => {
          handler({uid});
        }).then(
          () => spfAuthData.user()
        ).then(
          uo => expect(uo).to.equal(userObj)
        ).then(
          () => expect(spfAuthData.UserFirebaseObject.create).have.been.calledOnce()
        );
      });

    });

    describe('isPublicIdAvailable', function() {
      const publicId = 'bob';
      let publicIdRef, publicIdSnapshot;

      beforeEach(function() {
        publicIdRef = {once: sinon.stub()};
        publicIdSnapshot = {
          val: sinon.stub(),
          exists: sinon.stub()
        };
        publicIdRef.once.withArgs('value').returns(
          Promise.resolve(publicIdSnapshot)
        );
        db.ref.withArgs(`auth/usedPublicIds/${publicId}`).returns(publicIdRef);
      });

      it('should resolve to true if there are not record for the public id', function() {
        publicIdSnapshot.exists.returns(false);
        publicIdSnapshot.val.returns(null);

        return spfAuthData.isPublicIdAvailable(publicId).then(
          available => expect(available).to.be.true()
        );
      });

      it('should resolve to true if the public id is not used', function() {
        publicIdSnapshot.exists.returns(true);
        publicIdSnapshot.val.returns(false);

        return spfAuthData.isPublicIdAvailable(publicId).then(
          available => expect(available).to.be.true()
        );
      });

      it('should resolve to false if the public id is used', function() {
        publicIdSnapshot.exists.returns(true);
        publicIdSnapshot.val.returns(true);

        return spfAuthData.isPublicIdAvailable(publicId).then(
          available => expect(available).to.be.false()
        );
      });

    });

    describe('publicId', function() {
      const uid = 'google:123456';
      const publicId = 'bob';
      let userObject, authRef;

      beforeEach(function() {
        userObject = {publicId, $id: uid};
        authRef = {update: sinon.stub()};
        authRef.update.returns(Promise.resolve());
        db.ref.withArgs('auth').returns(authRef);
      });

      it('should reject if not given a syncchronized object (1/2)', function() {
        return spfAuthData.publicId().then(
          () => Promise.reject(new Error('unexpected')),
          () => expect(authRef.update).not.to.have.been.called()
        );
      });

      it('should reject if not given a syncchronized object (2/2)', function() {
        return spfAuthData.publicId({publicId}).then(
          () => Promise.reject(new Error('unexpected')),
          () => expect(authRef.update).not.to.have.been.called()
        );
      });

      it('should reject if not given a public id', function() {
        return spfAuthData.publicId({$id: uid}).then(
          () => Promise.reject(new Error('unexpected')),
          () => expect(authRef.update).not.to.have.been.called()
        );
      });

      it('should set the user public and mark it as used', function() {
        return spfAuthData.publicId(userObject).then(() => {
          expect(authRef.update).to.have.been.calledOnce();
          expect(authRef.update).to.have.been.calledWith({
            [`publicIds/${publicId}`]: uid,
            [`usedPublicIds/${publicId}`]: true,
            [`users/${uid}/publicId`]: publicId
          });
          expect(authRef.update).to.have.been.calledWith(
            sinon.match(patch => Object.keys(patch).length === 3)
          );
        });
      });

      it('should reject if the update failed', function() {
        authRef.update.returns(Promise.reject());

        return spfAuthData.publicId(userObject).then(
          () => Promise.reject(new Error('unexpected')),
          () => expect(authRef.update).to.have.been.called()
        );
      });
    });

  });

  describe('spfSchoolsFactory', function() {
    let spfSchools, db, ref, schoolsObj, $firebaseObject, firebaseApp;

    testInjectMatch(datastore.spfSchoolsFactory);

    beforeEach(function() {
      ref = {};
      db = {ref: sinon.stub()};
      db.ref.withArgs('classMentors/schools').returns(ref);
      firebaseApp = {database: sinon.stub()};
      firebaseApp.database.returns(db);

      schoolsObj = {$loaded: sinon.stub()};
      schoolsObj.$loaded.returns(Promise.resolve());
      $firebaseObject = sinon.stub();
      $firebaseObject.withArgs(ref).returns(schoolsObj);

      spfSchools = datastore.spfSchoolsFactory($firebaseObject, firebaseApp);
    });

    it('should load the list after the service creation', function() {
      expect($firebaseObject).to.have.been.calledOnce();
      expect($firebaseObject).to.have.been.calledWith(ref);
    });

    it('should return the loaded list of school', function() {
      return spfSchools().then(so => {
        expect(so).to.equal(schoolsObj);
        expect(schoolsObj.$loaded).to.have.been.called();
      });
    });

    it('should cache the list', function() {
      return spfSchools().then(
        () => spfSchools()
      ).then(
        so => expect(so).to.equal(schoolsObj)
      ).then(
        () => expect($firebaseObject).to.have.been.calledOnce()
      );
    });

  });

});
