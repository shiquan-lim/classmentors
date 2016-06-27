var expect    = require("chai").expect;
var request    = require('request')
//var sinon     = require('sinon');
//var worker = require("../src/worker");

var proxyquire   = require('proxyquire');
var MockFirebase = require('mockfirebase').MockFirebase;
var mock;
// load worker with firebase references mocked. 
var worker = proxyquire("../src/cm-worker", {
  firebase: function (url) {
    return (mock = new MockFirebase(url));
  }
});
worker.initiateFirebase("http://home.com", "1234");
//mock.flush();
// data is logged

describe("Worker", function() {
    it("gets service url", function() {
        //expect(worker.get_service_url("codeCombat", "chris")).to.equal("http://codecombat.com/db/user/chris/level.sessions?project=state.complete,levelID,levelName");
        expect(worker.get_service_url("codeSchool", "chris")).to.equal("https://www.codeschool.com/users/chris.json");
        expect(worker.get_service_url("freeCodeCamp","chris")).to.equal("https://www.freecodecamp.com/chris");
        expect(worker.get_service_url("BAD", "chris")).to.equal("");
    });
    it("processes service responses", function() {
        expect(worker.get_achievements_from_response("freeCodeCamp", ">[ 9 ]<")).to.equal('9');
        expect(worker.get_achievements_from_response("freeCodeCamp", ">[ 400 ]<")).to.equal('400');
        expect(worker.get_achievements_from_response("codeCombat", "[]")).to.equal(0);
        expect(worker.get_achievements_from_response("codeCombat", '[{"state":{"complete":true}}]')).to.equal(1);
        expect(worker.get_achievements_from_response("codeSchool", '{"badges":[]}')).to.equal(0);
    });
    
    //Todo: Add tests
    it("update achievements", function() {
        var location = "classMentors/userAchievements/chris/services/codeCombat";
        
        //update_achievements_and_clear_queue(location, theData, data, reject, resolve);
        worker.update_achievements_and_clear_queue(location, {}, {}, function (data){}, function (data){});
    });
    
    //Todo: Add tests
    it("processes tasks", function () {
        //process_task(data, progress, resolve, reject);
        //worker.process_task({ "service": "codeCombat", "id": "Chris" }, function (data) { }, function (data) { }, function (data) { });
    });
    
    //Todo: Add tests
    it("get profile", function () {
        //get_profile(body, data, reject, resolve) ;
        var body = JSON.stringify({"services":{"codeCombat":{"details":{"id":"Chris"}}}});
        worker.get_profile( body, {"service":"codeCombat"}, function (data) { }, function (data) { });
    });
    // Need to pass in done to test that callbacks are executed.
     it('can fetch a bad service url', function () {
        //fetch_service_url(theUrl, data,service, serviceID, reject, resolve, error,response, body,success)
        worker.fetch_service_url("http://TESTURL.COM", {}, "codeCombat", "Prof", function (data) { }, function (data) { }, false, {}, "TESTING", function(){});
    }); 
    it('can fetch a service profile', function (done) {
        //fetch_service_url(theUrl, data,service, reject, resolve, error,response, body,success)
        var success = function(){
            expect(arguments[0]).to.equal("classMentors/userAchievements/undefined/services/codeCombat");
            expect(arguments[1]["totalAchievements"]).to.equal(1);
            expect(arguments[2]['count']).to.equal(1);            
            done();
        };
        worker.fetch_service_url("http://TESTURL.COM", {}, "codeCombat", "Prof", function (data) { }, function (data) { }, false, { "statusCode": 200 }, '[{"state":{"complete":true}}]',success);
    });
    
    it('can update profile and clear task', function () {
        //update_profile_and_clear_task(err, data)
        worker.update_profile_and_clear_task(true, {},function (data) { }, function (data) { });
        worker.update_profile_and_clear_task(false, {},function (data) { }, function (data) { });
    });
    
    
});

// To mock request
/*
describe('Service requests', function(){
  before(function(done){
    sinon
      .stub(request, 'get')
      .yields(null, null, JSON.stringify({"foo": "bar"}));
    done();
  });

  //it('' ...
  
  after(function(done){
    request.get.restore();
    done();
  });
  

});
*/
