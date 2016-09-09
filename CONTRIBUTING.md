# Contributing

Pull Resquests (PR) are welcomes.


## Install

Fork [Class Mentors], then:

```shell
git clone git@github.com:your-user-id/classmentors.git
cd classmentors
git remote add upstream https://github.com/singpath/classmentors.git
npm install
```


## Feature branch

Avoid working fixes and new feature in your master branch. It will prevent you
from submitting focussed pull request or from working on more than one
fix/feature at a time.

Instead, create a branch for each fix or feature:
```shell
git checkout master
git pull upstream master
git checkout -b <branch-name>
```

Work and commit the fixes/features, and then push your branch:
```shell
git push origin <branch-name>
```

Visit your fork and send a Pull Request from that branch; the PR form URL
will have this form:

    https://github.com/singpath/classmentors/compare/master...<your-github-username>:<branch-name>

Once your PR is accepted:
```shell
git checkout master
git push origin --delete <branch-name>
git branch -D <branch-name>
git pull upstream master
```


## Firebase Access

If you don't have access to `singpath` or `singpath-play` Firebase apps,
[create a new firebase project](https://console.firebase.google.com/), and edit
`src/index.html` and `dist/classmentors/index.html` to set the correct Firebase
app; edit the `firebaseApp` property of the `classmentors.bootstrap()` options.
E.g.:
```javascript
Promise.all([
  System.import('classmentors'),
  System.import('firebase')
]).then(function(modules) {
  var classmentors = modules[0];
  var firebase = modules[1];
  var config = {
    apiKey: "AIzaSyBevpPRxI1uswkU-O2I89BA6e1QzgK7Wio",
    authDomain: "singpath-play.firebaseapp.com",
    databaseURL: "https://singpath-play.firebaseio.com"
  };

  classmentors.bootstrap({
    firebaseApp: firebase.initializeApp(config),
    singpathURL: 'https://localhost:8080/',
    backendURL: 'https://localhost:8081/'
  });
}).catch(function(err) {
  console.error(err);
});
```

You can find the firebase settings on your project overview clicking on
"Add Firebase to your web app".

To setup your Firebase DB, use the rules at [security_rules/security-rules.json].


## Run Dev server

To start a server listening on "https://localhost:8081":
```shell
npm start
```


## Building app bundle

To build a minified bundles of the singpath apps and its dependencies:
```shell
npm run build
```

To serve it:
```shell
npm run serve-build
```

## Github Pages

To build and push the app to the remote "origin" gh-pages branch:
```shell
npm run build:gh-pages -- '{
  "apiKey": "somekey",
  "authDomain": "some-id.firebaseapp.com",
  "databaseURL": "https://some-id.firebaseio.com"
}'
```

To let Travis update your Github pages automatically (only when master get updated),
you will need to enable Travis for your fork and set up some environment variables.

Using [Travis CLI]:
```shell
travis enable
travis env set --public PROD_FIREBASE_CONFIG_API_KEY "some-key"
travis env set --public PROD_FIREBASE_CONFIG_AUTH_DOMAIN "some-id.firebaseapp.com"
travis env set --public PROD_FIREBASE_CONFIG_DATABASE_URL "https://some-id.firebaseio.com"
travis env set --private GH_TOKEN some-github-oauth-token
```

You can create a Github Oauth token on your [personal access tokens] setting
page. The token will need "public_repo" permission.

Make sure `GH_TOKEN` is set as private, or a pull request could steal that
token. You can verify at
"https://travis-ci.org/<your-github-id>/classmentors/settings"

[Class Mentors]: https://github.com/singpath/classmentors
[Travis CLI]: https://github.com/travis-ci/travis.rb#installation
[personal access tokens]: https://github.com/settings/tokens
[security_rules/security-rules.json]: https://github.com/singpath/classmentors/blob/master/security_rules/security-rules.json
