import {expect, sinon, testInjectMatch} from 'singpath-core/tools/chai.js';

import {urlForFactory, urlForFilterFactory, run} from './routes';

describe('routes service', function() {
  let routes;

  beforeEach(function() {
    routes = {
      home: '/',
      profile: '/profile/:publicId'
    };
  });

  describe('urlFor service', function() {
    let urlFor;

    beforeEach(function() {
      urlFor = urlForFactory(routes);
    });

    testInjectMatch(urlForFactory);

    it('should return a static url', function() {
      expect(urlFor('home')).to.equal('/');
    });

    it('should return a dynamic url', function() {
      expect(urlFor('profile', {publicId: 'bob'})).to.equal('/profile/bob');
      expect(urlFor('profile', {publicId: 'alice'})).to.equal('/profile/alice');
    });

    it('should return home by default', function() {
      expect(urlFor('notFound')).to.equal('/');
    });

  });

  describe('urlFor filter', function() {
    let filter, urlFor, url;

    beforeEach(function() {
      url = '/foo';
      urlFor = sinon.stub().returns(url);
      filter = urlForFilterFactory(urlFor);
    });

    testInjectMatch(urlForFilterFactory);

    it('should proxy call to urlFor service', function() {
      const name = '';
      const params = {};
      const returnedUrl = filter(name, params);

      expect(urlFor).to.have.been.calledOnce();
      expect(urlFor).to.have.been.calledWith(name, params);
      expect(returnedUrl).to.equal(url);
    });

  });

  describe('run', function() {
    let $rootScope, $location, spfAlert;

    beforeEach(function() {
      $rootScope = {$on: sinon.stub()};
      $location = {path: sinon.spy()};
      routes = {home: '/foo'};
      spfAlert = {error: sinon.spy()};
    });

    testInjectMatch(run);

    it('should listen to route error event', function() {
      run($rootScope, $location, routes, spfAlert);

      expect($rootScope.$on).to.have.been.calledOnce();
      expect($rootScope.$on).to.have.been.calledWith('$routeChangeError', sinon.match.func);
    });

    it('should alert the user with the error', function() {
      $rootScope.$on.yields({}, {}, {}, new Error('foo'));
      run($rootScope, $location, routes, spfAlert);

      expect(spfAlert.error).to.have.been.calledOnce();
      expect(spfAlert.error).to.have.been.calledWith('foo');
    });

    it('should redirect to home if there is no current page loaded', function() {
      $rootScope.$on.yields({}, {}, null, {});
      run($rootScope, $location, routes, spfAlert);

      expect($location.path).to.have.been.calledOnce();
      expect($location.path).to.have.been.calledWith(routes.home);
    });
  });

});
