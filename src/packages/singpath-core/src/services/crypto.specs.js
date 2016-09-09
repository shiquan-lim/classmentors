import {expect, testInjectMatch} from 'singpath-core/tools/chai.js';

import * as crypto from './crypto.js';

describe('crypto service', function() {

  testInjectMatch(crypto.Service);

  describe('md5', function() {

    it('should hash the message', function() {
      const service = new crypto.Service();

      expect(service.md5('foo').toString()).to.equal('acbd18db4cc2f85cedef654fccc4a4d8');
    });

  });

  describe('randomString', function() {

    it('should create a random hex encoded string', function() {
      const service = new crypto.Service();
      const byteSize = 16;
      const strSize = byteSize * 2;
      const str = service.randomString(byteSize);

      expect(str.length).to.equal(strSize);
      expect(str).to.not.equal(service.randomString(byteSize));
    });

  });

  describe('password', function() {

    describe('settings', function() {
      let service;

      beforeEach(function() {
        service = new crypto.Service(16, 8, 2);
      });

      it('should have salt size settings', function() {
        expect(service.password.settings.saltSize).to.equal(16);
      });

      it('should have key size settings', function() {
        expect(service.password.settings.keySize).to.equal(8);
      });

      it('should have iterations settings', function() {
        expect(service.password.settings.iterations).to.equal(2);
      });

    });

    describe('newHash', function() {

      it('should create a hash', function() {
        const service = new crypto.Service(16, 8, 2);
        const hash = service.password.newHash('password');

        expect(hash.value.length).to.equal(64);
        expect(hash.options.salt.length).to.equal(32);
        expect(hash.options.keySize).to.equal(8);
        expect(hash.options.iterations).to.equal(2);
        expect(hash.options.hasher).to.equal('PBKDF2');
        expect(hash.options.prf).to.equal(crypto.prf);
      });

      it('should create a hash following the settings', function() {
        const service = new crypto.Service(32, 16, 4);
        const hash = service.password.newHash('password');

        expect(hash.value.length).to.equal(128);
        expect(hash.options.salt.length).to.equal(64);
        expect(hash.options.keySize).to.equal(16);
        expect(hash.options.iterations).to.equal(4);
      });

    });

    describe('fromSalt', function() {

      it('should create the same hash', function() {
        const service = new crypto.Service(16, 8, 2);
        const original = service.password.newHash('password');
        const copy = service.password.fromSalt('password', original.options.salt, original.options);

        expect(copy).to.equal(original.value);
      });

      it('should attempt to create the same hash with default options', function() {
        const service = new crypto.Service(16, 8, 2);
        const original = service.password.newHash('password');
        const copy = service.password.fromSalt('password', original.options.salt, {});

        expect(copy).to.equal(original.value);
      });

    });

  });

});
