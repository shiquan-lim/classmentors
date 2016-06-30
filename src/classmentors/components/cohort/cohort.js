// import module from 'classmentors/module.js';
import cohortTmpl from './cohort-view.html!text';
// import './cohort.css!';

// This here didn't work, not sure why - Amos
export const component = {
    cohortTmpl
};
//
export function configRoute($routeProvider, routes){
    $routeProvider.when(routes.cohort, {
        template: cohortTmpl
    });
}
configRoute.$inject = ['$routeProvider', 'routes'];
//
// module.config([
//     '$routeProvider',
//     'routes',
//     function($routeProvider, routes){
//         console.log('SOMETHING HAPPENS HERE');
//         $routeProvider
//             .when(routes.cohort, {template: cohortTmpl})
//     }
// ]);