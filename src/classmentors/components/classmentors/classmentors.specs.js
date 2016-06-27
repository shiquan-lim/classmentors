import {expect} from 'chai';

import tmpl from './classmentors-view.html!text';
import {component} from './classmentors.js';

describe('classmentors component', function() {

  it('should set the template', function() {
    expect(component.template).to.equal(tmpl);
  });

});
