describe('calculator', function () {

  beforeEach(module('sampleApp'));

  var $controller;

  // injecting will cause an error.
  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));

  describe('sum', function () {
		it('1 + 1 should equal 2', function () {
			var $scope = {};
			var controller = $controller('SampleController', { $scope: $scope });
			$scope.x = 1;
			$scope.y = 2;
			$scope.sum();
			expect($scope.z).toBe(3);
            expect(1).toBe(1);
		});
	});
});
