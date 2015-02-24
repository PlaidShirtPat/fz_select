/*
 * A bootstrap select box with pure angular backing
 * Allows arbitrary values from <input> or from a list of values
 * Valid attributes: ng-model,
 *
 *
 */
angular.module( "fzSelect", [] )
.directive( "fzSelect", ['$filter', '$timeout', '$parse',
  function($filter, $timeout, $parse){
    return {
      restrict: 'EA',
      // require: ['ngModel', 'fzSelectItems'],
      template: 
'<div class="input-group" >'+
  '<input class="form-control" ng-model="searchString"></input>'+
  '<span class="input-group-btn">'+
    '<button class="btn btn-primary" ng-click="showAll()" >&#9660;</button>'+
  '</span>'+
'</div>'+
'<div class="fz-select-results-container" ng-if="resultsVisible.value"> '+
  '<div  class="fz-select-results-row" '+
    'ng-repeat="item in filteredItems" '+
    'ng-click="resultItemClicked(item)">{{getItemDisplayString(item)}}</div>'+
'</div>',
      link: function($scope, element, attrs){

        angular.element(element).addClass('fz-select-component');

        var itemsGetter = $parse(attrs.fzSelectItems);
        var valueGetter = $parse(attrs.ngModel);
        var valueSetter = valueGetter.assign;

        var itemAttributeName = null;
        var itemAttributeGetter = null;
        if( attrs.hasOwnProperty('fzMatchAttribute') ){
          itemAttributeGetter = $parse(attrs.fzMatchAttribute);
          itemAttributeName = attrs.fzMatchAttribute;
        }

        var itemReturnAttributeName = "value";
        var itemReturnAttributeGetter = null;
        if( attrs.hasOwnProperty('fzReturnAttribute') ){
          itemReturnAttributeGetter = $parse(attrs.fzReturnAttribute);
          itemReturnAttributeName = attrs.fzReturnAttribute;
        } else if( attrs.hasOwnProperty('fzMatchAttribute') ){
          itemReturnAttributeGetter = $parse(attrs.fzMatchAttribute);
          itemReturnAttributeName = attrs.fzMatchAttribute;
        }


        var returnObjects = false;
        if( attrs.hasOwnProperty("fzReturnObjects") ){
          returnObjects = attrs.fzReturnObjects == "true";
        }

        $scope.items = itemsGetter($scope);
        $scope.searchString = valueGetter($scope);
        $scope.filteredItems = [];
        $scope.resultsVisible = {value: false};
        $scope.selectedValue = null;
        var valueWasSelected = false;

        $scope.showResults = function(show){
          $timeout(function(){
            $scope.resultsVisible.value = show;
          });
        };

        $scope.getItemDisplayString = function(item){
          if( itemAttributeGetter != null  ){
            return itemAttributeGetter(item); 
          }else{
            return item;
          }
        };

        $scope.showAll = function(){
          $scope.filteredItems = $scope.items;
          $scope.showResults(true);
        };

        $scope.updateSourceValue = function(){
          if($scope.selectedValue != null){
            if( itemReturnAttributeGetter != null  && !returnObjects){
              valueSetter($scope, itemReturnAttributeGetter($scope.selectedValue));
            } else {
              valueSetter($scope, $scope.selectedValue);
            }
          } else {
            if(returnObjects){
              var returnObject = {}
              returnObject[itemReturnAttributeName] = $scope.searchString;
              valueSetter($scope, returnObject);
            } else {
              valueSetter($scope, $scope.searchString);
            }
          }
        };

        $scope.resultItemClicked = function(item){
          $scope.selectedValue = item;
          $scope.searchString = $scope.getItemDisplayString(item);
          valueWasSelected = true;
          $scope.showResults(false);
        };

        $scope.filterItems = function(){
          var searchObject = {};
          if( itemAttributeName != null ){
            searchObject[itemAttributeName] = $scope.searchString;
          } else {
            searchObject = $scope.searchString;
          }

          var tempList = $filter('filter')($scope.items, $scope.searchString);
          $scope.filteredItems = tempList;
          if( $scope.searchString.length > 0 && !$scope.resultsVisible.value )
            $scope.showResults(true);
          if( $scope.searchString.length == 0 && $scope.resultsVisible.value )
            $scope.showResults(false);
        };

        $scope.$watch('searchString', function(){
          $scope.filterItems();
          if( !valueWasSelected )
            $scope.selectedValue = null;
          else
            valueWasSelected = false;
          $scope.updateSourceValue();
        }, true);

       
      }
    }
  }
])
