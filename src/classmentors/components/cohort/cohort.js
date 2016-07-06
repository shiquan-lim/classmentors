/**
 * classmentors/components/cohort/cohort.js- define cohort component.
 */

import cohortTmpl from './cohort-view.html!text';
// import './cohort.css!';

class CohortCtrl {

  constructor(spfNavBarService) {
    const title = 'Cohort';
    // e.g.: [{title: 'profile', url: '#' + urlFor(editProfile)}]
    const parentPages = [];
    // e.g.: [{title: 'edit profile', url: '#' + urlFor(editProfile), icon: 'settings'}]
    // icon id from icon set from
    // src/jspm_packages/github/singpath/singpath-core@x.x.x/services/icons/icons.specs.js
    const menuItems = [];

    spfNavBarService.update(title, parentPages, menuItems);
  }

}

CohortCtrl.$inject = ['spfNavBarService'];

export const component = {
  template: cohortTmpl,
  controller: CohortCtrl
};
