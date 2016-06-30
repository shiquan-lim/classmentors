SystemJS.config({
  paths: {
    "npm:": "jspm_packages/npm/",
    "github:": "jspm_packages/github/",
    "classmentors/": "classmentors/"
  },
  browserConfig: {
    "baseURL": "/",
    "depCache": {
      "app.js": [
        "angular",
        "./classmentors/index.js"
      ],
      "classmentors/components/ace/ace.js": [
        "./2015-ace-view.html!text"
      ],
      "classmentors/components/classmentors/classmentors.js": [
        "./classmentors-view.html!text",
        "./classmentors.css!"
      ],
      "classmentors/components/events/events.js": [
        "angular",
        "../../module.js",
        "./events-view-event-edit.html!text",
        "./events-view-event-table-participants.html!text",
        "./events-view-event-table-rank.html!text",
        "./events-view-event-task-form.html!text",
        "./events-view-event.html!text",
        "./events-view-list.html!text",
        "./events-view-new.html!text",
        "./events-view-pager.html!text",
        "./events-view-password.html!text",
        "./events-view-provide-link.html!text",
        "./events-view-provide-response.html!text",
        "./events.css!"
      ],
      "classmentors/components/index.js": [
        "classmentors/module.js",
        "./classmentors/classmentors.js",
        "./ace/ace.js",
        "./events/events.js",
        "./profiles/profiles.js"
      ],
      "classmentors/components/profiles/profiles.js": [
        "firebase",
        "./profiles-view-clm-profile.html!text",
        "./profiles-view-spf-profile.html!text",
        "./profiles-view-codecombat-lookup-error.html!text",
        "./profiles-view-edit.html!text",
        "./profiles-view-show.html!text",
        "./profiles.css!"
      ],
      "classmentors/directives.js": [
        "./module.js"
      ],
      "classmentors/filters.js": [
        "./module.js"
      ],
      "classmentors/index.js": [
        "./module.js",
        "./directives.js",
        "./filters.js",
        "./services/index.js",
        "./components/index.js"
      ],
      "classmentors/module.js": [
        "angular",
        "firebase",
        "angularfire",
        "angular-material",
        "angular-loading-bar",
        "angular-animate",
        "angular-messages",
        "angular-route",
        "singpath-core"
      ],
      "classmentors/services/datastore.js": [
        "angular",
        "../module.js"
      ],
      "classmentors/services/index.js": [
        "./datastore.js",
        "./routes.js"
      ],
      "classmentors/services/routes.js": [
        "../module.js"
      ],
      "github:ajaxorg/ace-builds@1.2.3/ace.js": [
        "ace/ace"
      ],
      "github:ajaxorg/ace-builds@1.2.3/mode-html.js": [
        "ace/ace"
      ],
      "github:ajaxorg/ace-builds@1.2.3/mode-java.js": [
        "ace/ace"
      ],
      "github:ajaxorg/ace-builds@1.2.3/mode-javascript.js": [
        "ace/ace"
      ],
      "github:ajaxorg/ace-builds@1.2.3/mode-python.js": [
        "ace/ace"
      ],
      "github:ajaxorg/ace-builds@1.2.3/theme-twilight.js": [
        "ace/ace"
      ],
      "github:angular/bower-angular-animate@1.5.7/angular-animate.js": [
        "angular"
      ],
      "github:angular/bower-angular-aria@1.5.7/angular-aria.js": [
        "angular"
      ],
      "github:angular/bower-angular-messages@1.5.7/angular-messages.js": [
        "angular"
      ],
      "github:angular/bower-angular-route@1.5.7/angular-route.js": [
        "angular"
      ],
      "github:angular/bower-material@1.0.9/angular-material.js": [
        "./angular-material.css!",
        "angular",
        "angular-animate",
        "angular-aria"
      ],
      "github:chieffancypants/angular-loading-bar@0.8.0/build/loading-bar.js": [
        "angular",
        "./loading-bar.css!"
      ],
      "github:firebase/angularfire@1.1.4/dist/angularfire.js": [
        "firebase",
        "angular"
      ],
      "github:singpath/singpath-core@0.3.2/components/ace/ace.js": [
        "angular",
        "../../module.js",
        "ace",
        "ace/mode-html.js",
        "ace/mode-java.js",
        "ace/mode-javascript.js",
        "ace/mode-python.js",
        "ace/theme-twilight.js",
        "./ace.css!"
      ],
      "github:singpath/singpath-core@0.3.2/components/alert/alert.js": [
        "../../module.js",
        "./alert-view-toaster.html!text",
        "./alert.css!text"
      ],
      "github:singpath/singpath-core@0.3.2/components/index.js": [
        "./ace/ace.js",
        "./alert/alert.js",
        "./navbar/navbar.js",
        "./sign/sign.js"
      ],
      "github:singpath/singpath-core@0.3.2/components/navbar/navbar.js": [
        "angular",
        "../../module.js",
        "./navbar-view.html!text",
        "./navbar.css!"
      ],
      "github:singpath/singpath-core@0.3.2/components/sign/sign.js": [
        "../../module.js",
        "./sign-view.html!text"
      ],
      "github:singpath/singpath-core@0.3.2/filters.js": [
        "./module.js"
      ],
      "github:singpath/singpath-core@0.3.2/index.js": [
        "./module.js",
        "./filters.js",
        "./services/index.js",
        "./components/index.js",
        "./shared.css!"
      ],
      "github:singpath/singpath-core@0.3.2/module.js": [
        "angular",
        "firebase",
        "angularfire",
        "angular-loading-bar",
        "angular-animate",
        "angular-messages",
        "angular-route",
        "angular-material"
      ],
      "github:singpath/singpath-core@0.3.2/services/countries.js": [
        "../module.js"
      ],
      "github:singpath/singpath-core@0.3.2/services/crypto.js": [
        "npm:systemjs-plugin-babel@0.0.11/babel-helpers/classCallCheck.js",
        "npm:systemjs-plugin-babel@0.0.11/babel-helpers/createClass.js",
        "cryptojs",
        "cryptojs/md5.js",
        "cryptojs/pbkdf2.js",
        "cryptojs/sha256.js"
      ],
      "github:singpath/singpath-core@0.3.2/services/datastore.js": [
        "angular",
        "../module.js"
      ],
      "github:singpath/singpath-core@0.3.2/services/firebase.js": [
        "angular",
        "firebase",
        "../module.js"
      ],
      "github:singpath/singpath-core@0.3.2/services/icons/icons.js": [
        "./svgdefs.svg!text",
        "./icons-python.svg!text",
        "./icons-angularjs.svg!text",
        "./icons-javascript.svg!text",
        "./icons-java.svg!text"
      ],
      "github:singpath/singpath-core@0.3.2/services/index.js": [
        "../module.js",
        "./countries.js",
        "./icons/icons.js",
        "./crypto.js",
        "./routes.js",
        "./datastore.js",
        "./firebase.js"
      ],
      "github:sytelus/cryptojs@3.1.2/hmac.js": [
        "cryptojs/core.js"
      ],
      "github:sytelus/cryptojs@3.1.2/md5.js": [
        "cryptojs/core.js"
      ],
      "github:sytelus/cryptojs@3.1.2/pbkdf2.js": [
        "cryptojs/sha1.js",
        "cryptojs/hmac.js"
      ],
      "github:sytelus/cryptojs@3.1.2/sha1.js": [
        "cryptojs/core.js"
      ],
      "github:sytelus/cryptojs@3.1.2/sha256.js": [
        "cryptojs/core.js"
      ]
    }
  },
  devConfig: {
    "map": {
      "plugin-babel": "npm:systemjs-plugin-babel@0.0.11"
    }
  },
  transpiler: "plugin-babel",
  packages: {
    "classmentors": {
      "main": "index.js",
      "meta": {
        "*.js": {
          "loader": "plugin-babel"
        }
      }
    }
  }
});

SystemJS.config({
  packageConfigPaths: [
    "npm:@*/*.json",
    "npm:*.json",
    "github:*/*.json"
  ],
  map: {
    "ace": "github:ajaxorg/ace-builds@1.2.3",
    "angular": "github:angular/bower-angular@1.5.7",
    "angular-animate": "github:angular/bower-angular-animate@1.5.7",
    "angular-aria": "github:angular/bower-angular-aria@1.5.7",
    "angular-loading-bar": "github:chieffancypants/angular-loading-bar@0.8.0",
    "angular-material": "github:angular/bower-material@1.0.9",
    "angular-messages": "github:angular/bower-angular-messages@1.5.7",
    "angular-route": "github:angular/bower-angular-route@1.5.7",
    "angularfire": "github:firebase/angularfire@1.1.4",
    "assert": "github:jspm/nodelibs-assert@0.2.0-alpha",
    "buffer": "github:jspm/nodelibs-buffer@0.2.0-alpha",
    "chai": "npm:chai@3.5.0",
    "child_process": "github:jspm/nodelibs-child_process@0.2.0-alpha",
    "core-js": "npm:core-js@1.2.6",
    "cryptojs": "github:sytelus/cryptojs@3.1.2",
    "css": "github:systemjs/plugin-css@0.1.22",
    "firebase": "github:firebase/firebase-bower@2.4.2",
    "fs": "github:jspm/nodelibs-fs@0.2.0-alpha",
    "path": "github:jspm/nodelibs-path@0.2.0-alpha",
    "process": "github:jspm/nodelibs-process@0.2.0-alpha",
    "singpath-core": "github:singpath/singpath-core@0.4.0",
    "sinon": "npm:sinon@1.17.4",
    "sinon-chai": "npm:sinon-chai@2.8.0",
    "text": "github:systemjs/plugin-text@0.0.8",
    "util": "github:jspm/nodelibs-util@0.2.0-alpha",
    "vm": "github:jspm/nodelibs-vm@0.2.0-alpha"
  },
  packages: {
    "github:chieffancypants/angular-loading-bar@0.8.0": {
      "map": {
        "css": "github:systemjs/plugin-css@0.1.22",
        "angular": "github:angular/bower-angular@1.5.7"
      }
    },
    "github:firebase/angularfire@1.1.4": {
      "map": {
        "angular": "github:angular/bower-angular@1.5.7",
        "firebase": "github:firebase/firebase-bower@2.4.2"
      }
    },
    "github:angular/bower-material@1.0.9": {
      "map": {
        "angular": "github:angular/bower-angular@1.5.7",
        "angular-animate": "github:angular/bower-angular-animate@1.5.7",
        "css": "github:systemjs/plugin-css@0.1.22",
        "angular-aria": "github:angular/bower-angular-aria@1.5.7"
      }
    },
    "npm:sinon@1.17.4": {
      "map": {
        "util": "npm:util@0.10.3",
        "formatio": "npm:formatio@1.1.1",
        "samsam": "npm:samsam@1.1.2",
        "lolex": "npm:lolex@1.3.2"
      }
    },
    "npm:chai@3.5.0": {
      "map": {
        "assertion-error": "npm:assertion-error@1.0.2",
        "type-detect": "npm:type-detect@1.0.0",
        "deep-eql": "npm:deep-eql@0.1.3"
      }
    },
    "npm:formatio@1.1.1": {
      "map": {
        "samsam": "npm:samsam@1.1.3"
      }
    },
    "npm:util@0.10.3": {
      "map": {
        "inherits": "npm:inherits@2.0.1"
      }
    },
    "npm:deep-eql@0.1.3": {
      "map": {
        "type-detect": "npm:type-detect@0.1.1"
      }
    },
    "github:jspm/nodelibs-buffer@0.2.0-alpha": {
      "map": {
        "buffer-browserify": "npm:buffer@4.7.0"
      }
    },
    "github:angular/bower-angular-aria@1.5.7": {
      "map": {
        "angular": "github:angular/bower-angular@1.5.7"
      }
    },
    "github:angular/bower-angular-animate@1.5.7": {
      "map": {
        "angular": "github:angular/bower-angular@1.5.7"
      }
    },
    "github:angular/bower-angular-messages@1.5.7": {
      "map": {
        "angular": "github:angular/bower-angular@1.5.7"
      }
    },
    "github:angular/bower-angular-route@1.5.7": {
      "map": {
        "angular": "github:angular/bower-angular@1.5.7"
      }
    },
    "npm:buffer@4.7.0": {
      "map": {
        "ieee754": "npm:ieee754@1.1.6",
        "isarray": "npm:isarray@1.0.0",
        "base64-js": "npm:base64-js@1.1.2"
      }
    }
  }
});
