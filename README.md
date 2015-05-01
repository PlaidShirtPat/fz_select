```
  __                  _           _   
 / _|___     ___  ___| | ___  ___| |_ 
| ||_  /____/ __|/ _ \ |/ _ \/ __| __|
|  _/ /_____\__ \  __/ |  __/ (__| |_ 
|_|/___|    |___/\___|_|\___|\___|\__|
                                      
```

A bootstrap select component with angularjs

Most of the documentation is in fz_select.js Will update this more later

Here's a demo of the component
http://plnkr.co/edit/aTtP7mqLzfnPSEXVgOER?p=preview


Here's how to override the component's style
This will alter the heights for the fz-select-bs style and it's small counterpart
```css
/** overrides for fz-select **/
// default
.fz-select-component.fz-select-bs>.fz-search-box>input {
  height: 34px !important;
  padding: 7px 9px !important;
}
.fz-select-component.fz-select-bs>.fz-search-box>span>button {
  height: 34px !important;
}

// small
.fz-select-component.fz-select-bs.fz-input-sm>.fz-search-box>input {
  height: 28px !important;
}
.fz-select-component.fz-select-bs.fz-input-sm>.fz-search-box>span>button {
  height: 28px !important;
  padding: 4px 10px !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
}


```


TODO:
Make the results set look cleaner
Support ng-repeat style lists "item.value as item.name for item in items"
Add more support for watching source list.
Add tests
Rewrite the whole thing with what I've learned from the first attempt
