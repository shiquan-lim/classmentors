/* eslint no-new: "off" */
import {expect} from 'chai';
import sinon from 'sinon';

import tmpl from './2015-ace-view.html!text';
import {component, factory, ACE_STATS_URL} from './ace.js';

describe('ace component', function() {

  it('should set the template', function() {
    expect(component.template).to.equal(tmpl);
  });

  describe('controller', function() {
    let navBarService;

    beforeEach(function() {
      navBarService = {
        update: sinon.spy()
      };
    });

    it('should update the navbar title', function() {
      new component.controller(navBarService);

      expect(navBarService.update).to.have.been.calledOnce;
      expect(navBarService.update).to.have.been.calledWithExactly(sinon.match.string);
    });

  });

});

describe('aceStatsUrl constant', function() {

  it('should be set', function() {
    expect(ACE_STATS_URL).to.be.ok;
  });

});

describe('aceStats service', function() {
  const aceStatsUrl = 'http://ace.stats/';
  let aceStats, http;

  beforeEach(function() {
    http = {
      get: sinon.stub().returns(Promise.reject())
    };
    aceStats = factory(http, aceStatsUrl);
  });

  it('should fetch the ace stats', function() {
    aceStats();
    expect(http.get).to.have.been.calledOnce;
    expect(http.get).to.have.been.calledWithExactly(aceStatsUrl);
  });

  it('should resolve to the response data', function() {
    const resp = {data: {some: 'stats'}};

    http.get.returns(Promise.resolve(resp));

    // By returning a promise, the test runner knows the test asynchronous
    // and will wait for it resolve.
    return aceStats().then(
      data => expect(data).to.equal(resp.data)
    );
  });
});
