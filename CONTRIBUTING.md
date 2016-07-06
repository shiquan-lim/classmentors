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

If you don't have access to `singpath` or `singpath-play` Firebase DBs, edit
`src/index.html` and `dist/classmentors/index.html` to point to the correct
Firebase DB id; edit the `firebaseId` property. E.g.:
```javascript
System.import('classmentors').then(function(classmentors) {
  classmentors.bootstrap({
    firebaseId: 'singpath-play',
    singpathURL: 'https://localhost:8080/',
    backendURL: 'https://localhost:8081/'
  });
}).catch(function(err) {
  console.error(err);
});
```

To setup your Firebase DB:
```
npm install @singpath/rules
./node_modules/.bin/singpath-rules compile
```

It will generate `rules.json` to use on your Firebase security tab.


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
npm run build:gh-pages -- "my-firebase-database-name"
```

To let Travis update your Github pages automatically (only when master get updated),
you will need to enable Travis for your fork and set up some environment variables.

Using [Travis CLI]:
```shell
travis enable
travis env set --public PROD_FIREBASE_ID "my-firebase-database-name"
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
