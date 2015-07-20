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
    'ng-keydown="onInputKeydown($event)" '+
    'ng-change="onSearchStringChanged()" ' +
    'ng-model="searchString" />' +
  '<div ' +
    'class="fz-results-toggle" ' +
    'ng-click="showResults(true)" ' +
    '/>' +
  '<div ' +
    'class="fz-results-container" ' +
    'tabindex=0 '+
    'ng-keydown="onResultsKeydown($event)" >' +

    '<div ' +
      'ng-class="{\'fz-selected\': isHighlightedItem(filteredItem)}" ' +
      'ng-repeat="filteredItem in filteredItems" ' + 
      'class="fz-results-row" >' +
      '{{getResultDisplay(filteredItem)}}' +
    '</div> ' + 
  '</div>' +
'</div>',

      link: function(scope, element, attrs){

        /**** FLAGS ****/
        var isAsync = false;
        var returnObjects = false; 
        scope.searchStringChanged = false;

        /**** SETTINGS ****/
        var matchAttribute = null;
        var DEFAULT_REFRESH_RATE = 1000;
        var refreshRate = null;

        var asyncRefreshPromise = null;


        scope.filteredItems = [];
        scope.selectedItem = null;
        scope.searchString = null;
        highlightedItem = null;

        var highlightedItem = null;

        scope.isHighlightedItem = function(item){
          return highlightedItem === item;
        }

        scope.onSearchStringChanged = function(){
          console.log("search string changed");
          scope.searchStringChanged = true;
          //these need to be called by the source list changed lister
          //if async
          if(!isAsync){
            filterItems();
            orderItems();
          }
        };

        var updateNgModel = function(){
          scope.ngModel = scope.selectedItem;
        };

        var selectItem = function(){
          scope.selectedItem = highlightedItem;
          updateNgModel();
        }

        var focusSearchBox = function(){

        };

        scope.onResultsKeydown = function($event){
          if($event != undefined)
            $event.preventDefault();
          currentIndex = scope.filteredItems.indexOf(highlightedItem);

          switch($event.keyCode){
            case 40:
              if(currentIndex != scope.filteredItems.length-1)
                highlightedItem = scope.filteredItems[currentIndex + 1];
              break;
            case 38:
              if(currentIndex == 0)
                focusSearchBox();
              else
                highlightedItem = scope.filteredItems[currentIndex - 1];
              break;
            case 13:
              selectItem();
            default:
              return;
          }
          
        };

        var focusResults = function(startAtTop, $event){
          if($event != undefined)
            $event.preventDefault();

          if(startAtTop){
            highlightedItem = scope.filteredItems[0];
          } else { 
            highlightedItem = 
              scope.filteredItems[scope.filteredItems.length-1];
          }

          results = $(element).find('.fz-results-container');
          if(results && results.focus)
            results.focus();

        };

        var selectDefaultItem = function(){
          highlightedItem = scope.filteredItems[0];
          selectItem();
        };

        scope.onInputKeydown = function($event){
          switch($event.keyCode){
            case 40:
              
              focusResults(true, $event);
              break;
            case 38:
              focusResults(false, $event);
              break;
            case 13: 
              selectDefaultItem();
              break;
            default:
              return;
          }
        }

        //returns true/false if the items match
        var itemsMatch = function(item1, item2){
          if(item1 == null && item2 == null)
            return true;

          //if only one is null
          if(item1 == null || item2 == null)
            return false;

          if(matchAttribute)
            return item1[matchAttribute] == item2[matchAttribute];
          else
            return item1 == item2;
        };

        var orderItems = function(){
          if(matchAttribute){
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
          if(isAsync){
              scope.filteredItems = scope.fzSelectItems;
          } else {
            scope.filteredItems = 
              $filter('filter')(scope.fzSelectItems, scope.searchString);
          }
          scope.searchStringChanged = false;
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

          if(isAsync)
            startAsyncRefresh();

          initListeners();
        };

        var startAsyncRefresh = function(){
          asyncRefreshPromise = $interval(function(){
            console.log("async called, change: " + scope.searchStringChanged);
            if(scope.searchStringChanged)
              scope.fzRefresh(scope.searchString);
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
            console.log("source list changed");
            filterItems();
            orderItems();
          });
          scope.$on('$destroy', cleanUp);
        }

        initComponent();
      }
    }
  }
])
