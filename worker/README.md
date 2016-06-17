# Achievement Profile

[![Build Status](https://travis-ci.org/PivotalExpert/profile.svg?branch=master)](https://travis-ci.org/PivotalExpert/profile)
[![Coverage Status](https://coveralls.io/repos/github/PivotalExpert/profile/badge.svg?branch=master)](https://coveralls.io/github/PivotalExpert/profile?branch=master)
## Overview

Profile is a realtime profile updating system powered by Firebase that allows users to sign in via Gitub and update their profiles in realtime. It uses a queue and simple achievement worker running on a node server to securely handle fetching achievements in a trusted way for end users.

## Frontend Deployment

Profile

```shell
cd frontend
vi firebase.json    #change "firebase": "<your-firebase>" 
firebase deploy
firebase open
```

## Backend Deployment
