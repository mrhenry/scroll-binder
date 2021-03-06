# Scroll Binder

Scroll Binder is a simple module that binds CSS values to scroll position. [Find a demo here](//pieterbeulque.github.io/scroll-binder).

*Crafted with love by [@pieterbeulque](//github.com/pieterbeulque) at [@mrhenry](//github.com/mrhenry)*

## Features

* Animate CSS properties over scroll
* Support for CSS transforms
* Absolutely easy syntax
* Using CSS defaults

## How it works

Scroll Binder takes an element, a scrolling distance and a big JS object containing child selectors and CSS properties with a `from` and `to` value.
It builds a function that calculates the actual value for every scroll position and assigns it on scroll.

### Example

Let's say you have a fixed header that should reduce in padding and scale the logo when scrolling the first 200 pixels.

```html
<div class="header">
  <div class="logo"></div>
  <ul class="navigation"></ul>
</div>
```

```js
var header = new ScrollBinder($('.header'), {
  over: 200,
  animations: {
    'this': {
      'padding-top': { to: 20 },
      'padding-bottom': { to: 20 }
    },
    '.logo': {
      'scale': { to: .5 }
    }
  }
});
```

### Options

Initiating ScrollBinder takes two arguments: `$element` and `options`.

Options has a property `over`, being an integer of the scrolling distance and a property `animations`, specifying what should happen on scroll.

`animations` is an object that has selectors as keys (+ `this` for the actual element). The animatied properties then are specified in an object with CSS properties as keys and a tweening object as value. A tweening object looks like `{ from: int, to: int, over: int, unit: string }`. Either `from` or `to` is optional, taking over the initial value from the CSS. `over` is optional too, allowing you to override the global scrolling distance. `unit` is optional too, falling back to `px` for normal CSS properties and an empty string for transform properties.

**Since 0.0.3** there's support for viewport detection (still very basic, and very opinionated; up for improvements).
You can add a `viewport: true` to your property animation and it will wait for the animation to start until the elements top enters the bottom of the viewport. You can also use `'viewport'` as a value for `over` which will use the viewport height (minus a top & bottom buffer of the `delay` value) as the animation duration. *Note that animating the top position while using viewport may be buggy. It also doesn't support resizing your viewport after initial load*.

**Since 0.0.4** you can also toggle a class, using the `to:string` as a class that will be added, `delay` and `over` as used with all properties. *Note that this might still be buggy*.

```js
'.selector': {
  'class': { to: 'is-top-right', delay: 200, over: 2000 }
}
```

### Dependencies

For now, dependent on any recent jQuery version (using `$()`, `$().find()`, `$.inArray`, `$.proxy` and `$().css()`).

