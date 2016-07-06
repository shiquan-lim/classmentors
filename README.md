# Class Mentors UI


## Install

Download the lastest package from the
[release page](https://github.com/singpath/classmentors/releases),
extract it, and serve it. E.g. using Python SimpleHTTPServer:

```shell
wget https://github.com/singpath/classmentors/releases/download/v0.4.2/classmentors.zip
unzip classmentors.zip
cd classmentors
python -m SimpleHTTPServer 8000
```

Edit `firebaseId` in `index.html` to point to the correct Firebase DB id. By
default, the build version points to "singpath" (our production DB).


## Building from source

To build a minified bundles of the singpath apps and its dependencies:
```shell
git clone https://github.com/singpath/classmentors.git
cd classmentors
npm install
npm run build
```

The bundle will be available in `dist/`. To serve it:
```shell
npm run serve-build
```


## Read more

- [Development](./CONTRIBUTING.md);
- [Release](./RELEASE.md).
