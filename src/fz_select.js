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
 * fzAllowPartialResult   Expects boolean
 *                        Default: false
 *                        If true, when a user hits enter without selecting 
 *                        a result, the control sets ngModel to the search 
 *                        string entered.
 *                        The search string will be added to the top of the 
 *                        results list in order to give users a way to click on
 *                        the result.
 *                        This option is for situations where you want to suggest
 *                        options to a user, but will also accept a freely
 *                        entered value.
 *                        When used in conjunction with fzReturnObjects, the
 *                        entered string will be set to fzReturnAttribute. If 
 *                        fzReturnAttribute.
 *
 *
 * fzReturnAttribute:     Expects string
 *                        Useful if you have a list like [ {name: '', email: ''} 
 *                        and want to search by name, but return the email
 *                        defaults to fzMatchAttribute
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
'<div class="fz-search-box" ' +
  'ng-blur="hideResults()" >' +
  '<div class="fz-search-input-container">' +
    '<input ' + 
      'class="fz-search-input" ' +
      'ng-keydown="onInputKeydown($event)" '+
      'ng-blur="onInputBlur($event)" ' +
      'ng-focus="onInputFocus($event)" ' +
      'ng-change="onSearchStringChanged()" ' +
      'ng-model="searchString" />' +
  '</div> ' +
  '<div ' +
    'class="fz-results-toggle" ' +
    'ng-click="toggleResults()" ' +
    '>' +
    '<span ng-if="resultsVisible">&#9650;</span> ' +
    '<span ng-if="!resultsVisible">&#9660;</span> ' +
  '</div> ' +
  '<div class="fz-search-spacer"></div>' + 
  '<div ' +
    'class="fz-results-container" ' +
    'ng-show="resultsVisible" ' +
    'ng-blur="onResultsBlur($event)" ' +
    'tabindex=0 '+
    'ng-keydown="onResultsKeydown($event)" >' +

    '<div ' +
      'class="fz-results-row" ' +
      'ng-repeat="filteredItem in filteredItems" ' + 
      'ng-class="{\'fz-selected\': isHighlightedItem(filteredItem)}" ' +
      'ng-click="onResultClicked($event, filteredItem)" >' +
      '{{getResultDisplay(filteredItem)}}' +
    '</div> ' + 
  '</div>' +
'</div>',

      link: function(scope, element, attrs){

        /**** FLAGS ****/
        var listInitialized = false;
        var isAsync = false;
        var allowPartialResult = false;
        var returnObjects = false; 
        scope.searchStringChanged = false;
        scope.resultsVisible = false;
        var skipNextBlur = false;

        /**** SETTINGS ****/
        var matchAttribute = null;
        var returnAttribute = null;
        var DEFAULT_REFRESH_RATE = 1000;
        var refreshRate = null;

        /**** CONTROLLER VARS ****/
        var asyncRefreshPromise = null;
        scope.filteredItems = [];
        scope.selectedItem = null;
        scope.searchString = "";
        var highlightedItem = null;
        var inputBlurTimeoutPromise = null;

        var highlightedItem = null;

        scope.isHighlightedItem = function(item){
          return highlightedItem === item;
        }

        scope.onSearchStringChanged = function(){
          scope.searchStringChanged = true;
          //these need to be called by the source list changed lister
          //if async
          if(!isAsync){
            filterItems();
            orderItems();
          }
        };

        var updateNgModel = function(){
          if(returnObjects)
            scope.ngModel = scope.selectedItem;
          else{
            //if there is a return attribute and selected item exists
            if(returnAttribute && scope.selectedItem)
              scope.ngModel = scope.selectedItem[returnAttribute];
            //if we don't have a selected item, or if we don't have a return 
            //attribute, we can just return the item
            else
              scope.ngModel = scope.selectedItem
          }
          if(matchAttribute)
            scope.searchString = scope.selectedItem[matchAttribute];
          else
            scope.searchString = scope.selectedItem;
        };

        var selectItem = function(){
          scope.selectedItem = highlightedItem;
          updateNgModel();
          scope.hideResults();
        }

        var focusSearchBox = function($event){
          preventDefault($event);
          skipNextBlur = true;
          results = $(element).find('.fz-search-input');
          if(results && results.focus)
            results.focus();
        };

        scope.onResultsKeydown = function($event){
          preventDefault($event);
          currentIndex = scope.filteredItems.indexOf(highlightedItem);

          switch($event.keyCode){
            case 40:
              if(currentIndex != scope.filteredItems.length-1)
                highlightedItem = scope.filteredItems[currentIndex + 1];
              break;
            case 38:
              if(currentIndex == 0)
                focusSearchBox($event);
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
          preventDefault($event);

          skipNextBlur = true;

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


        var highlightDefaultItem = function(){
          highlightedItem = scope.filteredItems[0];
        };

        var selectDefaultItem = function(){
          highlightDefaultItem();
          selectItem();
        };


        var preventDefault = function($event){
          if($event && $event.preventDefault)
            $event.preventDefault();
        }

        scope.onResultClicked = function($event, item){
          preventDefault($event);
          if(inputBlurTimeoutPromise){
            $timeout.cancel(inputBlurTimeoutPromise);
          }
          highlightedItem = item;
          selectItem();
        }

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
          //add the search string as a result
          if(allowPartialResult){
            addPartialResult(scope.filteredItems);
          }
          highlightDefaultItem();
        }


        var createResultObject = function(){
          newResult = {};
          newResult[matchAttribute] = scope.searchString;
          newResult[returnAttribute] = scope.searchString;
          return newResult;
        };

        var addPartialResult = function(items){
          if(returnObjects)
            newResult = createResultObject();
          else
            newResult = scope.searchString;
          items.unshift(newResult);
        }

        var filterItems = function(){
          //if async, skip filtering
          if(isAsync){
              scope.filteredItems = scope.fzSelectItems;
          } else {
            scope.filteredItems = 
              $filter('filter')(scope.fzSelectItems, scope.searchString);
          }
          scope.showResults();
          scope.searchStringChanged = false;
        };


        scope.onInputFocus = function($event){
          preventDefault($event);

          scope.showResults();
        };

        scope.onResultsBlur = function($event){
          preventDefault($event);
          if(!skipNextBlur){
            scope.hideResults();
          } else {
            skipNextBlur = false;
          }
        };

        scope.onInputBlur = function($event){
          preventDefault($event);
          if(!skipNextBlur){
            inputBlurTimeoutPromise = $timeout(function(){
              scope.hideResults();
            }, 500);
          } else {
            skipNextBlur = false;
          }
        };

        scope.hideResults = function($event){
          preventDefault($event);
          scope.resultsVisible = false;
        }

        scope.toggleResults = function($event){
          if(scope.resultsVisible)
            scope.hideResults();
          else
            scope.showResults();
        }

        scope.showResults = function($event){
          preventDefault($event);
          scope.resultsVisible = true;
        }


        var initComponent = function(){

          //set flags
          if(scope.fzRefresh)
            isAsync = true;

          if(attrs.hasOwnProperty("fzReturnObjects"))
            returnObjects = attrs.fzReturnObjects == "true";

          //set settings
          if(attrs.hasOwnProperty("fzMatchAttribute"))
            matchAttribute = attrs.fzMatchAttribute;

          if(attrs.hasOwnProperty("fzReturnAttribute"))
            returnAttribute = attrs.fzReturnAttribute;
          else
            returnAttribute = matchAttribute;

          if(attrs.hasOwnProperty("fzInitialSearchString"))
            scope.searchString = attrs.fzInitialSearchString;

          if(attrs.hasOwnProperty("fzRefreshRate"))
            refreshRate = attrs.fzRefreshRate;
          else if(isAsync && refreshRate == null)
            refreshRate = DEFAULT_REFRESH_RATE;

          if(attrs.hasOwnProperty("fzAllowPartialResult"))
            allowPartialResult = attrs.fzAllowPartialResult == "true";

          scope.filteredItems = scope.fzSelectItems;

          if(isAsync)
            startAsyncRefresh();

          initListeners();
        };

        var startAsyncRefresh = function(){
          asyncRefreshPromise = $interval(function(){
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
            if(!listInitialized){
              listInitialized = true;
              return;
            }

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
