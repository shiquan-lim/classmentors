'use strict';

import module from 'classmentors/module.js';

/**
 * Label paths - to be used by each component to configure their route.
 *
 * See src/app/components/events for example.
 *
 */
module.constant('routes', {
  // home: '/events',
  home: '/profile/',
  aceOfCoders: '/ace-of-coders',
  events: '/events',
  newEvent: '/new-event',
  oneEvent: '/events/:eventId',
  editEvent: '/events/:eventId/edit',
  editEventTask: '/events/:eventId/task/:taskId',
  addEventTask: '/events/:eventId/new-task',
  profile: '/profile/:publicId',
  editProfile: '/profile/',
  setProfileCodeCombatId: '/profile/codeCombat',
  cohort:'/cohort'
});
