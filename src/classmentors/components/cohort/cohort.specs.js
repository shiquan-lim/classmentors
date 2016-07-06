/**
 * classmentors/components/cohort/cohort.specs.js - Test for cohort component
 */
import {expect} from 'chai';
import sinon from 'sinon';

import * as cohort from './cohort.js';

describe('cohort component', function() {

  describe('controller', function() {
    let ctrl, navBarService;

    beforeEach(function() {
      navBarService = {
        update: sinon.stub()
      };

      ctrl = new cohort.component.controller(navBarService);

      if (ctrl.$onInit) {
        ctrl.$onInit();
      }
    });

    it('should update navbar with title', function() {
      expect(navBarService.update).to.have.been.calledOnce;
      expect(navBarService.update).to.have.been.calledWith('Cohort');
    });

    it('should update navbar with an empty list of parent section', function() {
      expect(navBarService.update).to.have.been.calledOnce;
      expect(navBarService.update).to.have.been.calledWith(
        sinon.match.string,
        sinon.match(list => !list || list.length === 0)
      );
    });

    it('should update navbar with an empty list of actions', function() {
      expect(navBarService.update).to.have.been.calledOnce;
      expect(navBarService.update).to.have.been.calledWith(
        sinon.match.string,
        sinon.match.any,
        sinon.match(list => !list || list.length === 0)
      );
    });
  });

});
