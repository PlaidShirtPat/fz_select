/*
 * A bootstrap select box with pure angular backing
 * Allows arbitrary values from <input> or from a list of values
 * Valid attributes: ng-model,
 * 
 * fzSelectItems:         Expects an Array 
 *                        The source list for the select component. 
 *
 * fzRefresh:             Expects a function 
 *                        signature should look something like:
 *                        function refresh(searchString)
 *                        If set, the component will call the supplied function
 *                        when it comes time to refresh the list.
 *
 * fzRefreshRate:         Expects integer
 *                        defaults to 1000
 *                        How often the component will call the refresh function
 *                        (in milliseconds)
 *  
 * fzMatchAttribute:      Expects string
 *                        if the list contains objects, this is the attribute name
 *                        of the desired value EG: if your list looks like 
 *                        [ { a: 'val' }, .... ] setting fzMatchAttribute to 'a', 
 *                        the component will return the value of a of the selected
 *                        item.
 *
 * fzReturnAttribute:     Expects string
 *                        Useful if you have a list like [ {name: '', email: ''} 
 *                        and want to search by name, but return the email
 *
 * fzIncludeNullOption:   Expects boolean
 *                        Set to true if you want a null item prepended to the 
 *                        result list to allow for a blank option
 *
 * fzInitialSearchString  Expects string
 *                        The initial search string for the component
 *
 * fzReturnObjects:       Expects boolean
 *                        Component will return objects, even for arbitrary input.
 *                        This is useful in conjunction with fzReturnAttribute. 
 *                        If you are searching a list of contacts by name, but 
 *                        also want to be able to return some arbitrary email, 
 *                        the component will return an object like: 
 *                        { email: 'asd@asd.com' } instead of just a string value.
 */

angular.module( "fzSelect", [] )
.directive( "fzSelect", ['$filter', '$timeout', '$parse', '$interval',
  function($filter, $timeout, $parse, $interval){
    return {
      restrict: 'EA',
      scope: {
        'fzSelectItems': "=",
        'fzRefresh': "=",
        'ngModel': "=",
      },
      template: 
'<div class="fz-search-box" >' +
  '<input ' + 
    'class="fz-search-input" ' +
    'ng-change="searchStringChanged()" ' +
    'ng-model="searchString" />' +
  '<div ' +
    'class="fz-results-toggle" ' +
    'ng-click="showResults(true)" ' +
    '/>' +
  '<div ' +
    'class="fz-results-container" ' +
    'ng-repeat="filteredItem in filteredItems" >' +

    '<div ' +
      'ng-class="{\'fz-selected\': isHighlightedItem(filteredItem)}" ' +
      'class="fz-results-row" >' +
      '{{getResultDisplay(filteredItem)}}' +
    '</div> ' + 
  '</div>' +
'</div>',

      link: function(scope, element, attrs){

        /**** FLAGS ****/
        var isAsync = false;
        var returnObjects = false; var isInitialized = false;
        var selectedItemInitialized = false;
        var listInitialized = false;

        /**** SETTINGS ****/
        var matchAttribute = null;
        var DEFAULT_REFRESH_RATE = 1000;
        var refreshRate = null;

        var asyncRefreshPromise = null;
        scope.filteredItems = [];
        scope.selectedItem = null;
        scope.searchString = null;

        var highlightedItem = null;

        scope.isHighlightedItem = function(item){
          return scope.highlightedItem === item;
        }

        scope.searchStringChanged = function(){
          filterItems();
          orderItems();
          updateCurrentItem();
        };

        var updateNgModel = function(){
          scope.ngModel = scope.selectedItem;
        };

        var updateCurrentItem;

        //returns true/false if the items match
        var itemsMatch = function(item1, item2){
          if(item1 == null && item2 == null)
            return true;

          //if only one is null
          if(item1 == null || item2 == null)
            return false;

          if(fzMatchAttribute)
            return item1[fzMatchAttribute] == item2[fzMatchAttribute];
          else
            return item1 == item2;
        };

        // sets highlightedItem to the first item in the list that matches
        var setCurrentItem = function(){
          for(i=0; i<scope.fzSelectItems.length; i++){
            if(itemsMatch(scope.fzSelectItems[i], scope.ngModel)){
              highlightedItem = fzSelectItems[i];
              break;
            }
          }
        };

        var orderItems = function(){
          if(fzMatchAttribute){
            scope.filteredItems = $filter('orderBy')(
              scope.filteredItems, 
              matchAttribute,
              false);
          } else {
            scope.filteredItems = $filter('orderBy')(
              scope.filteredItems, 
              false);
          }
        }

        var filterItems = function(){
          //if async, skip filtering
          if(isAsync)
            return; 

          scope.filteredItems = 
            $filter('filter')(scope.fzSelectItems, scope.searchString);
        };


        var initComponent = function(){

          //set flags
          if(scope.fzRefresh)
            isAsync = true;

          if(attrs.hasOwnProperty("fzReturnObjects"))
            returnObjects = attrs.fzReturnObjects;

          //set settings
          if(attrs.hasOwnProperty("fzMatchAttribute"))
            matchAttribute = attrs.fzMatchAttribute;

          if(attrs.hasOwnProperty("fzInitialSearchString"))
            scope.searchString = attrs.fzInitialSearchString;

          if(attrs.hasOwnProperty("fzRefreshRate"))
            refreshRate = attrs.fzRefreshRate;
          else if(isAsync && refreshRate == null)
            refreshRate = DEFAULT_REFRESH_RATE;

          if(!isAsync){
            //if ngModel has an initial value, initialize the component to that value
            if(!(scope.ngModel == "" && scope.ngModel == null)){
              setSelectedItem();
            }
            selectedItemInitialized = true;
            listInitialized = true;
          } else {
            startAsyncRefresh();
          }

          initListeners();
        };

        var startAsyncRefresh = function(){
          asyncRefreshPromise = $interval(function(){
            scope.fzRefresh();
          }, refreshRate);
        };

        scope.getResultDisplay = function(item){
          if(matchAttribute)
            return item[matchAttribute];
          else
            return item;
        };

        var cleanUp = function(){
          $interval.cancel(asyncRefreshPromise);
        };

        var setSearchString = function(){
          if(scope.ngModel == null)
            scope.searchString = 
          scope.searchString = scop
        };

        initListeners = function(){
          scope.$watch('fzSelectItems', function(){
            setCurrentItem();
          });
          scope.$on('$destroy', cleanUp);
        }

        initComponent();
      }
    }
  }
])
