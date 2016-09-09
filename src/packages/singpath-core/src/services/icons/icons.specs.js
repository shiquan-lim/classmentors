import {expect, sinon} from 'singpath-core/tools/chai.js';

import * as icons from './icons.js';
import setTmpl from './svgdefs.svg!text';
import pythonTmpl from './icons-python.svg!text';
import angularjsTmpl from './icons-angularjs.svg!text';
import javascriptTmpl from './icons-javascript.svg!text';
import javaTmpl from './icons-java.svg!text';

describe('icon sets', function() {

  describe('config', function() {
    let mdIconProvider;

    beforeEach(function() {
      mdIconProvider = {
        defaultIconSet: sinon.spy(),
        icon: sinon.spy()
      };
      icons.config(mdIconProvider);
    });

    it('should register the default icon set', function() {
      expect(mdIconProvider.defaultIconSet).to.have.been.calledOnce();
      expect(mdIconProvider.defaultIconSet).to.have.been.calledWithExactly(
        'icons/svgdefs.svg', 1024
      );
    });

    it('should register angularjs icon', function() {
      expect(mdIconProvider.icon).to.have.been.calledWith(
        'language:angularjs', 'icons/icons-angularjs.svg', 128
      );
    });

    it('should register java icon', function() {
      expect(mdIconProvider.icon).to.have.been.calledWith(
        'language:java', 'icons/icons-java.svg', 128
      );
    });

    it('should register javascript icon', function() {
      expect(mdIconProvider.icon).to.have.been.calledWith(
        'language:javascript', 'icons/icons-javascript.svg', 128
      );
    });

    it('should register python icon', function() {
      expect(mdIconProvider.icon).to.have.been.calledWith(
        'language:python', 'icons/icons-python.svg', 128
      );
    });

  });

  describe('run', function() {
    let cache;

    beforeEach(function() {
      cache = {put: sinon.spy()};
      icons.run(cache);
    });

    it('should populate the cache with the icon set', function() {
      expect(cache.put).to.have.been.calledWith('icons/svgdefs.svg', setTmpl);
    });

    it('should populate the cache with the angularjs', function() {
      expect(cache.put).to.have.been.calledWith('icons/icons-angularjs.svg', angularjsTmpl);
    });

    it('should populate the cache with the java', function() {
      expect(cache.put).to.have.been.calledWith('icons/icons-java.svg', javaTmpl);
    });

    it('should populate the cache with the javascript', function() {
      expect(cache.put).to.have.been.calledWith('icons/icons-javascript.svg', javascriptTmpl);
    });

    it('should populate the cache with the python', function() {
      expect(cache.put).to.have.been.calledWith('icons/icons-python.svg', pythonTmpl);
    });

  });

});
