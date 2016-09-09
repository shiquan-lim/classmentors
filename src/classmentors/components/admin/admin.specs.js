import admin from './admin.js';
import {testInjectMatch, expect, sinon} from 'classmentors/tools/chai.js';

function wait(delay) {
  return new Promise(resolve => setTimeout(resolve, delay || 10));
}

describe('admin GUI', function() {

  describe('component', function() {
    let ctrlFactory,
      ctrl,
      $q,
      $log,
      spfNavBarService,
      spfCurrentUser,
      clmDatastore,
      settings,
      stopUserWatch,
      stopSettingWatch;

    testInjectMatch(admin.component.controller);

    beforeEach(function() {
      $q = (resolve, reject) => new Promise(resolve, reject);
      $q.all = ps => Promise.all(ps);

      $log = {error: sinon.spy()};

      spfNavBarService = {update: sinon.spy()};

      stopUserWatch = sinon.stub();
      spfCurrentUser = {
        id: 'google:bob',
        publicId: 'bob',
        firebaseUser: {uid: 'google:bob'},
        user: {id: 'google:bob', publicId: 'bob'},
        profile: {displayName: 'bob smith', isAdmin: true},
        $watch: sinon.stub(),
        $loaded: sinon.stub()
      };
      spfCurrentUser.$loaded.returns(Promise.resolve());
      spfCurrentUser.$watch.returns(stopUserWatch);

      stopSettingWatch = sinon.spy();
      settings = [];
      settings.$loaded = sinon.stub();
      settings.$loaded.returns(Promise.resolve());
      settings.$watch = sinon.stub();
      settings.$watch.returns(stopSettingWatch);
      clmDatastore = {settings: {get: sinon.stub()}};
      clmDatastore.settings.get.returns(settings);

      ctrlFactory = () => {
        ctrl = new admin.component.controller($q, $log, spfNavBarService, spfCurrentUser, clmDatastore);

        if (ctrl.$onInit) {
          ctrl.$onInit();
        }
      };
    });

    describe('init', function() {
      beforeEach(function() {
        ctrlFactory();
      });

      it('should reset navbar', function() {
        expect(spfNavBarService.update).to.have.been.calledOnce();
        expect(spfNavBarService.update).to.have.been.calledWith(sinon.match.string);
      });

      it('should set currentUser', function() {
        expect(ctrl.currentUser).to.equal(spfCurrentUser);
      });

      it('should request request the list of settings', function() {
        expect(clmDatastore.settings.get).to.have.been.calledOnce();
        expect(ctrl.settings).to.equal(settings);
      });

      it('should set permission error when the currentUser is updated', function() {
        return wait().then(() => {
          expect(spfCurrentUser.$watch).to.have.been.calledOnce();
          expect(spfCurrentUser.$watch).to.have.been.calledWith(sinon.match.func);

          sinon.spy(ctrl, 'checkAccess');
          spfCurrentUser.$watch.lastCall.args[0]({});
          expect(ctrl.checkAccess).to.have.been.calledWith(spfCurrentUser);
        });
      });

      it('should filter settings when the settings are updated', function() {
        return wait().then(() => {
          expect(settings.$watch).to.have.been.calledOnce();
          expect(settings.$watch).to.have.been.calledWith(sinon.match.func);

          sinon.spy(ctrl, 'filterSettings');
          settings.$watch.lastCall.args[0]();
          expect(ctrl.filterSettings).to.have.been.calledOnce();
        });
      });

    });

    describe('failed', function() {

      it('should set loading and loaded to false', function() {
        ctrlFactory();

        ctrl.loaded = false;
        ctrl.loading = true;
        ctrl.failed();

        expect(ctrl.loaded).to.be.false();
        expect(ctrl.loading).to.be.false();
      });

      it('should switch errors.loading', function() {
        ctrlFactory();

        ctrl.errors = {};
        ctrl.failed();

        expect(ctrl.errors.loading).to.be.true();
      });

      it('should log the error', function() {
        const err = new Error();

        ctrlFactory();
        ctrl.failed(err);

        expect($log.error).to.have.been.calledOnce();
        expect($log.error).to.have.been.calledWith(err);
      });

      it('should be called on loading error', function() {
        settings.$loaded.returns(Promise.reject());
        sinon.spy(admin.component.controller.prototype, 'failed');
        ctrlFactory();

        return wait().then(() => {
          expect(ctrl.failed).to.have.been.calledOnce();
        });
      });

    });

    describe('checkAccess', function() {

      beforeEach(function() {
        ctrlFactory();
      });

      it('should set login error if the user is logged off', function() {
        ctrl.checkAccess({});
        expect(ctrl.errors.login).to.be.false();

        ctrl.checkAccess({uid: null});
        expect(ctrl.errors.login).to.be.true();

        ctrl.checkAccess({uid: 'google:12345'});
        expect(ctrl.errors.login).to.be.false();
      });

      it('should set register error if the user is not registered', function() {
        ctrl.checkAccess({});
        expect(ctrl.errors.register).to.be.false();

        ctrl.checkAccess({uid: 'google:12345'});
        expect(ctrl.errors.register).to.be.false();

        ctrl.checkAccess({uid: 'google:12345', publicId: null});
        expect(ctrl.errors.register).to.be.true();

        ctrl.checkAccess({uid: 'google:12345', publicId: 'bob'});
        expect(ctrl.errors.register).to.be.false();
      });

      it('should set admin error if the user is not an admin', function() {
        ctrl.checkAccess({});
        expect(ctrl.errors.admin).to.be.false();

        ctrl.checkAccess({uid: 'google:12345'});
        expect(ctrl.errors.admin).to.be.false();

        ctrl.checkAccess({uid: 'google:12345', publicId: null});
        expect(ctrl.errors.admin).to.be.false();

        ctrl.checkAccess({uid: 'google:12345', publicId: 'bob'});
        expect(ctrl.errors.admin).to.be.true();

        ctrl.checkAccess({uid: 'google:12345', publicId: 'bob', isAdmin: false});
        expect(ctrl.errors.admin).to.be.true();

        ctrl.checkAccess({uid: 'google:12345', publicId: 'bob', isAdmin: true});
        expect(ctrl.errors.admin).to.be.false();
      });

    });

    describe('filterSettings', function() {

      beforeEach(function() {
        ctrlFactory();
      });

      beforeEach(function() {
        ctrl.settings.push({title: 'foo', type: 'boolean'});
        ctrl.settings.push({title: 'bar', type: 'input'});
      });

      it('should set list of switches settings', function() {
        ctrl.filterSettings();
        expect(ctrl.switches).to.eql([{title: 'foo', type: 'boolean'}]);
      });

      it('should set list of input settings', function() {
        ctrl.filterSettings();
        expect(ctrl.inputs).to.eql([{title: 'bar', type: 'input'}]);
      });

    });

    describe('$onDestroy', function() {

      beforeEach(function() {
        ctrlFactory();
      });

      it('should stop watching settings', function() {
        return wait().then(
          () => ctrl.$onDestroy()
        ).then(
          () => expect(stopSettingWatch).to.have.been.calledOnce
        );
      });

      it('should stop watching user', function() {
        return wait().then(
          () => ctrl.$onDestroy()
        ).then(
          () => expect(stopUserWatch).to.have.been.calledOnce
        );
      });

      it('should log err', function() {
        const err = new Error();

        stopUserWatch.throws(err);

        return wait().then(
          () => ctrl.$onDestroy()
        ).then(
          () => expect($log.error).to.have.been.calledWith(err)
        );
      });

    });

  });

  describe('configRoute', function() {
    let $routeProvider, routes;

    testInjectMatch(admin.configRoute);

    beforeEach(function() {
      $routeProvider = {when: sinon.stub()};
      $routeProvider.when.returnsThis();
      routes = {admin: '/admin'};

      admin.configRoute($routeProvider, routes);
    });

    it('should setup admin route', function() {
      expect($routeProvider.when).to.have.been.calledOnce();
      expect($routeProvider.when).to.have.been.calledWith(
        '/admin',
        sinon.match({template: '<clm-admin></clm-admin>'})
      );
    });
  });

});
