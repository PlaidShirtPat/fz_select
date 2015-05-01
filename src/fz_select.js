/*
 * A bootstrap select box with pure angular backing
 * Allows arbitrary values from <input> or from a list of values
 * Valid attributes: ng-model,
 * 
 * fzSelectItems:       Expects an Array or Function
 *                      The source list for the select component. If it is a 
 *                      function, the return is expected to be either an 
 *                      array or a $q promise.
 *                      If the source list is a $q, then the list will not sort
 *                      locally.
 *
 * fzRefresh:           Expects a function
 *                      Requires fzRefreshRate
 *                      signature should look something like:
 *                      function refresh(searchString)
 *                      If set, the component will call the supplied function
 *                      when it comes time to refresh the list.
 *
 * fzRefreshRate:       Expects integer
 *                      Requires fzRefresh
 *                      How often the component will call the refresh function
 *  
 * fzMatchAttribute:    Expects string
 *                      if the list contains objects, this is the attribute name
 *                      of the desired value EG: if your list looks like 
 *                      [ { a: 'val' }, .... ] setting fzMatchAttribute to 'a', 
 *                      the component will return the value of a of the selected
 *                      item.
 *
 * fzReturnAttribute:   Expects string
 *                      Useful if you have a list like [ {name: '', email: ''} 
 *                      and want to search by name, but return the email
 *
 * fzIncludeNullOption: Expects boolean
 *                      Set to true if you want a null item prepended to the 
 *                      result list to allow for a blank option
 *
 * fzReturnObjects:     Expects boolean
 *                      Component will return objects, even for arbitrary input.
 *                      This is useful in conjunction with fzReturnAttribute. 
 *                      If you are searching a list of contacts by name, but 
 *                      also want to be able to return some arbitrary email, 
 *                      the component will return an object like: 
 *                      { email: 'asd@asd.com' } instead of just a string value.
 */

angular.module( "fzSelect", [] )
.directive( "fzSelect", ['$filter', '$timeout', '$parse', '$interval',
  function($filter, $timeout, $parse, $interval){
    return {
      restrict: 'EA',
      scope: true,
      template: 
'<div class="fz-search-box" >'+
  '<input class="fz-select-input" ng-model="searchString" ' + 
    'ng-keydown="inputKeyDown($event)"></input>'+
  '<span>' +
    '<button class="fz-select-button" ng-click="showAll()" > ' + 
      '<span ng-if="!resultsVisible.value">&#9660</span> ' +
      '<span ng-if="resultsVisible.value">&#9650</span> ' +
    '</button>'+
  '</span>' +
'</div>'+
'<div class="fz-select-results-wrapper"> '+
  '<div class="fz-select-results-container" ng-show="resultsVisible.value" ' +
    'ng-blur="resultsVisible.value = false;" > '+
    '<div  class="fz-select-results-row" '+
      'ng-class="{\'fz-selected-row\': $index == selectedRowIndex}" '+
      'ng-repeat="item in filteredItems" '+
      'ng-keydown="resultsKeydown($event, item)" '+
      'ng-focus="resultFocused($event, item)" ' +
      'tabindex=0 '+
      'ng-click="resultItemClicked(item)">{{getItemDisplayString(item)}}</div>'+
  '</div>' +
'</div>',

      link: function($scope, element, attrs){

        function initilizeError(message){
          element.html('Error initlizing component.');
          throw message;
        };

        angular.element(element).addClass('fz-select-component');

        var itemsGetter = $parse(attrs.fzSelectItems);
        var valueGetter = $parse(attrs.ngModel);
        var valueSetter = valueGetter.assign;

        $scope.orderObject = {attribute: '', reverse: false};
        var itemAttributeName = null;
        var itemAttributeGetter = null;
        if( attrs.hasOwnProperty('fzMatchAttribute') ){
          itemAttributeGetter = $parse(attrs.fzMatchAttribute);
          itemAttributeName = attrs.fzMatchAttribute;
          $scope.orderObject.attribute = attrs.fzMatchAttribute;
        }

        var itemReturnAttributeName = "value";
        var itemReturnAttributeGetter = null;
        var hasSpecialReturnAttribute =  attrs.hasOwnProperty('fzReturnAttribute');
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

        //Either refreshRate and Refresh are set, or neither
        //are set
        if(!(
            (attrs.hasOwnProperty("fzRefreshRate") && 
             attrs.hasOwnProperty("fzRefresh")) ||
            (!attrs.hasOwnProperty("fzRefreshRate") && 
             !attrs.hasOwnProperty("fzRefresh")))
        ){
          initilizeError( 
            "fzSelect have both fzRefreshRate and fzRefresh or " +
            "have neither set." )
        }

        // item list is async
        var isAsync =  attrs.hasOwnProperty("fzRefresh"); 

        var refreshRate = null;
        if(attrs.hasOwnProperty("fzRefreshRate"))
          refreshRate = parseInt( attrs.fzRefreshRate );

        var refreshFunction = null;
        var refreshPromise = null;
        if(attrs.hasOwnProperty("fzRefresh"))
          refreshFunction = $parse(attrs.fzRefresh);

        var includeNullOption = false;
        if(attrs.hasOwnProperty("fzIncludeNullOption"))
          includeNullOption = attrs.fzIncludeNullOption == "true";

        $scope.selectedRowIndex = 0;

        $scope.filteredItems = [];
        $scope.resultsVisible = {value: false};
        $scope.selectedValue = null;
        var valueWasSelected = false;

        //initilize the search string value
        function initSearchString(){
          //if there is no return attribute specified, return the value
          if(itemReturnAttributeGetter == null){
              $scope.searchString = valueGetter($scope);
          //find the object that matches the return value
          } else if(itemAttributeGetter != null){
            var itemList = itemsGetter($scope);
            var value = null;

            // if the value is null, no init nessessary 
            if(valueGetter($scope) == null)
              return;

            if(returnObjects)
              value = valueGetter($scope)[itemAttributeName];
            else
              value = valueGetter($scope);

            for(var i=0; i < itemList.length; i++){
              if( itemList[i][itemReturnAttributeName] == value){
                $scope.searchString = itemList[i][itemAttributeName];
                $scope.selectedValue = itemList[i];
                break;
              }
            }
          } else {
            $scope.searchString = valueGetter();
          }
        }


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
          //if the results are visible, don't show
          if($scope.resultsVisible.value)
            $scope.showResults(false);
          else
            $scope.filterItems(true);
        };

        $scope.updateSourceValue = function(){
          if($scope.selectedValue != null){
            if( itemReturnAttributeGetter != null  && !returnObjects){
              valueSetter( $scope, 
                  itemReturnAttributeGetter($scope.selectedValue));
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

        $scope.resultsKeydown = function($event, item){
          function moveResults(isUp){
            $event.preventDefault();
            if( isUp )
              angular.element(angular.element($event.target).prev()).focus();
            else
              angular.element(angular.element($event.target).next()).focus();
          }
          switch($event.keyCode){
            case 40:
              moveResults(false);
              break;
            case 38:
              moveResults(true);
              break;
            case 13:
              $scope.resultItemClicked(item);
            default:
              return;
          }
        }

        function getResultsContainer(){
          var children = angular.element(element).children();
          var container = null;
          angular.forEach(children, function(child){
            if( angular.element(child).hasClass( 'fz-select-results-wrapper' ) )
              container = angular.element(child).children()[0];
          });
          return container;
        }

        $scope.resultFocused = function($event, item){
          $scope.selectedRowIndex = $scope.filteredItems.indexOf(item);
        }

        var focusResults = function($event){
          $scope.resultsVisible.value = true;
          if($event != undefined)
            $event.preventDefault();
          $timeout(function(){
            var container = getResultsContainer()
            if( container != null )
              angular.element(angular.element(container).children()[0]).focus();
          });
        };

        $scope.inputKeyDown = function($event){

          switch($event.keyCode){
            case 40:
              focusResults($event);
              break;
            case 38:
              focusResults($event);
              break;

            default:
              return;
          }
        };

        $scope.resultItemClicked = function(item){
          $scope.selectedValue = item;
          $scope.searchString = $scope.getItemDisplayString(item);
          valueWasSelected = true;
          $scope.updateSourceValue();
          $scope.showResults(false);
        };

        function orderItems(items){
          return $filter('orderBy')(
              items, 
              $scope.orderObject.attribute, 
              $scope.orderObject.reverse);
        }

        function getItems(){
          return itemsGetter($scope);
        }

        // update items, should not be used for async 
        function updateItems(onlyOrder){

          var tempList = getItems();

          //if we are filtering, put it 
          if(!onlyOrder)
            tempList = $filter('filter')(tempList, $scope.searchString);

          //order the items if it's not async
          tempList = orderItems(tempList);

          $scope.filteredItems = tempList;
          addNullOption();
        }

        function addNullOption(){
          if(includeNullOption){
            if( itemReturnAttributeGetter == null){
              $scope.filteredItems.unshift(null);
            } else {
              var nullItem = {};
              nullItem[itemReturnAttributeName] = null;
              $scope.filteredItems.unshift(nullItem);
            }
          }
        }

        var initialFilter = true;
        /*
         * Filter the item list based on the search string
         * This method is the only place showResults(true) should be called
         * onlyOrder: boolean; only order the list, do not filter
         */
        $scope.filterItems = function(onlyOrder){
          
          var searchObject = {};
          if( itemAttributeName != null )
            searchObject[itemAttributeName] = $scope.searchString;
          else
            searchObject = $scope.searchString;

          if( !isAsync )
            updateItems(onlyOrder);

          //Do not show results if the search string is set to null and 
          //we're not only ordering
          if( $scope.searchString == null && !onlyOrder ){
            $scope.showResults(false);
          } else {
            if( onlyOrder){
              $scope.showResults(true);
            //If it's the initial filter, do not show items. 
            //This prevents the results from being shown when the component 
            //is initilized
            } else if( $scope.searchString.length > 0 
                && !$scope.resultsVisible.value && !initialFilter ) {
              $scope.showResults(true);
            } else if( $scope.searchString.length == 0 && 
                       $scope.resultsVisible.value ){
              $scope.showResults(false);
            }
            initialFilter = false;
          }
        };

        var searchStringChanged = false;

        //watch the model for changes
        $scope.$watch(attrs.ngModel, function(){
          initSearchString();
        }, true);

        $scope.$watch('searchString', function(){
          if(!componentInitialized)
            return;
          searchStringChanged = true;
          $scope.filterItems();
          $scope.selectedRowIndex = 0;
          if( !valueWasSelected )
            $scope.selectedValue = null;
          else
            valueWasSelected = false;
          $scope.updateSourceValue();
        }, true);

        $scope.$watch('selectedRowIndex', function(){
          if(!componentInitialized)
            return;
          if($scope.selectedRowIndex < 0 || 
            $scope.selectedRowIndex > ($scope.filteredItems.length - 1))
            $scope.selectedRowIndex = 0;
        }, true);

        $scope.$on('$destroy', function(){
          $interval.cancel(refreshPromise);
        });

        function callRefreshFunction(searchString){
          refreshFunction($scope)(searchString);
        };

        var componentInitialized = false;
        function initAsync(){
          $scope.searchString = valueGetter($scope);
          callRefreshFunction($scope.searchString);
          refreshPromise = $interval(function(){
            if(searchStringChanged)
              callRefreshFunction($scope.searchString);
            searchStringChanged = false;
            $scope.filteredItems = getItems();
            addNullOption();
          }, refreshRate);
          $timeout(function(){
            componentInitialized = true;
          });
        }

        function initSync(){
          initSearchString();
          $timeout(function(){
            componentInitialized = true;
          });
        }

        // code to run once setup is finished
        function initComponent(){
          if(isAsync){
            initAsync();
          } else {
            initSync();
          }
        }
        initComponent();
      }
    }
  }
])
