(function ($, window, document) {
  'use strict';

  /**
   * A nice header that collapses when scrolling down the page
   *
   * @constructor
   * @name ScrollBinder
   */
  function ScrollBinder($element, options) {
    options = options || {};

    /**
     * Parent for all animated elements
     * @type {Object} Must be jQuery object
     */
    this.$element = $element || $(document.body);
    this.element = this.$element.get(0);

    this.currentScrollingPosition = -1;

    /**
     * Total scrolling distance / duration of the animation
     * @type {int}
     */
    this.scrollDistance = parseInt(options.over, 10) || 70;

    /**
     * Scrolling distance to wait before starting the animation
     * @type {[type]}
     */
    this.scrollDelay = parseInt(options.delay, 10) || 0;

    /**
     * Animation definitions. Key: selector, value: object with css properties and from/to values
     * @type {Object}
     */
    this.animations = (typeof options.animations === 'object') ? options.animations : {};

    // @fixme - These should not be public
    this.scrollTarget = document.body;
    this.scrollFlag = true;
    this.scrollEnd = null;

    this.transforms = [
      'scale', 'scaleX', 'scaleY',
      'rotate', 'rotateX', 'rotateY', 'rotateZ',
      'translateX', 'translateY', 'translateZ',
      'skewX', 'skewY',
      'perspective'
    ];

    this.init().bind();
  }

  /**
   * Init everything
   * @return {ScrollBinder} Instance for chainability
   */
  ScrollBinder.prototype.init = function () {
    var styles = window.getComputedStyle(this.element),
        overflow = styles.getPropertyValue('overflow'),
        overflowY = styles.getPropertyValue('overflow-y');

    if (overflow === 'auto' || overflow ==='scroll' || overflowY === 'auto' || overflowY ==='scroll') {
      this.scrollTarget = this.element;
    }

    this.initAnimations();
    this.animate(this.scrollTarget.scrollTop);

    return this;
  };

  /**
   * Bind all event handlers for this module
   * @return {ScrollBinder} Instance for chainability
   */
  ScrollBinder.prototype.bind = function () {
    var self = this,
        noScrollTimeout = null,
        bind = function () {
          $(self.scrollTarget).one('scroll', function () { self.loop(); });
        };

    if ($(self.scrollTarget).is('body')) {
      bind = function () {
        $(window).one('scroll', function () { self.loop(); });
      };
    }

    this.loop = function () {
      var scrollingPosition = self.scrollTarget.scrollTop,
          scrollChanged = (scrollingPosition !== self.currentScrollingPosition);

      self.currentScrollingPosition = scrollingPosition;

      self.nextFrame = self.requestFrame.call(window, function () {
        if (scrollChanged) {
          clearTimeout(noScrollTimeout);
          noScrollTimeout = null;
          self.onScroll();
        } else if (!noScrollTimeout) {
          noScrollTimeout = setTimeout(function () {
            self.cancelFrame.call(window, self.nextFrame);
            bind();
          }, 128);
        }

        self.loop();
      });
    };

    bind();

    return this;
  };

  /**
   * Reset module to its primary state
   * @return {ScrollBinder} Instance for chainability
   */
  ScrollBinder.prototype.reset = function () {
    var self = this;

    clearTimeout(this.scrollEnd);

    this.requestFrame.call(window, function () {
      for (var selector in self.animations) {
        if (self.animations.hasOwnProperty(selector)) {
          var animations = self.animations[selector];

          for (var i = 0; i < animations.length; i++) {
            var animation = animations[i],
                $element = animation.$element,
                element = animation.element,
                properties = animation.properties,
                css = {};

            for (var property in properties) {
              if (properties.hasOwnProperty(property)) {
                if (property === 'class') {
                  properties[property].fn(self.scrollTarget.scrollTop, animation.element);
                } else {
                  css[property] = '';
                }
              }
            }

            css['-webkit-transform'] = css['-ms-transform'] = css['transform'] = '';

            $element.css(css);
          }
        }
      }
    });

    return this;
  };

  /**
   * Unbind all handlers
   * @return {ScrollBinder} Instance for chainability
   */
  ScrollBinder.prototype.unbind = function () {
    this.loop = function () { };
    this.cancelFrame.call(window, this.nextFrame);

    return this;
  };

  /**
   * Initialize all animations from user input to usable objects
   * @return {Object} All initiated animations
   */
  ScrollBinder.prototype.initAnimations = function () {
    var initAnimations = [];

    // Loop all selectors
    for (var selector in this.animations) {
      if (this.animations.hasOwnProperty(selector)) {
        var initSelector = this.initSelector(selector, this.animations[selector]);

        if (!!initSelector) {
          initAnimations.push(initSelector);
        }
      }
    }

    // Override user specified animations with initialized animations
    this.animations = initAnimations;

    return this.animations;
  };

  ScrollBinder.prototype.initSelector = function (selector, properties) {
    var self = this,
        elements = [],
        matches = [];

    // Cache the targeted element
    // We can select the parent element by using this instead of a selector
    if (selector === 'this') {
      elements = [this.element];
    } else {
      elements = this.element.querySelectorAll(selector);
    }

    if (elements.length === 0) {
      return false;
    }

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];

      // Create a new object that will hold all initialized values
      var init = {
        init: true,
        $element: $(element),
        element: element,
        properties: {}
      }, willChange = [];

      // Loop all CSS properties for current selector
      for (var property in properties) {
        if (properties.hasOwnProperty(property)) {
          init.properties[property] = self.initProperty(property, properties[property], init.element);

          if (init.properties[property].isTransform && willChange.indexOf('transform') === -1) {
            willChange.push('transform');
          } else if (!init.properties[property].isTransform) {
            willChange.push(property);
          }
        }
      }

      init.element.style.willChange = willChange.join(',');

      matches.push(init);
    }

    return matches;
  };

  ScrollBinder.prototype.initProperty = function (property, value, element) {
    var isTransform  = (this.transforms.indexOf(property) > -1),
        isClass      = (property === 'class'),
        isLock       = (property === 'lock'),
        defaultValue = parseFloat(window.getComputedStyle(element)[property]),
        from         = value.from,
        to           = value.to,
        over         = value.over || this.scrollDistance,
        delay        = value.delay || this.scrollDelay,
        unit         = (typeof value.unit === 'string') ? value.unit : (isTransform ? '' : 'px'),
        viewport     = (typeof value.viewport === 'undefined') ? false : true,
        sway         = (typeof value.sway === 'undefined') ? false : true;

    defaultValue = isNaN(defaultValue) ? 0 : defaultValue;

    from = (typeof from === 'undefined') ? defaultValue : from;
    to   = (typeof to === 'undefined') ? defaultValue : to;

    if (typeof over === 'function') {
      over = over(element);
    }

    if (typeof delay === 'function') {
      delay = delay(element);
    }

    if (over === 'viewport') {
      over = (window.innerHeight - 2 * delay);
    }

    if (viewport) {
      // @ todo — Fix this by looping offset parents until we're at this.scrollTarget
      // or something :-)
      // We're currently not running into bugs with this
      // because if we're not scrolling on body
      // we're doing it in a (0, 0, window.width, window.height) div
      delay += ($(element).offset().top - window.innerHeight);
    }

    var fn;

    if (isClass) {
      fn = this.buildToggleClassFunction(to, over, delay)
    } else if (isLock) {
      fn = this.buildLockFunction(over, delay, element);
    } else {
      fn = this.buildPropertyFunction(from, to, over, delay, sway)
    }

    // Construct the animation function for this property and attach it to the initialized object
    return {
      fn: fn,
      isTransform: isTransform,
      isClass: isClass,
      isLock: isLock,
      unit: unit
    };
  };

  /**
   * Build a function that takes a scroll position and returns the current value for a certain property
   * Compare it to a simple algebra function like y = 2x where x would be the scroll position
   *
   * @param  {int} from    Default property value (scrollPos = 0)
   * @param  {int} to      Maximum property value (scrollPos = max)
   * @param  {int} over    Maximum scrolling distance
   * @param  {int} delay   Scrolling distance to wait before scrolling
   * @return {Function}    Funtion that takes current scroll position as an argument and returns the property value
   */
  ScrollBinder.prototype.buildPropertyFunction = function(from, to, over, delay, sway) {
    var lookup, fn;

    delay = ~~delay;

    if ('Int16Array' in window) {
      // This can offcourse throw weird bugs when using values bigger than Int16 can hold
      // but that should actually never be the case because then you're doing something
      // really weird
      lookup = new Int16Array(Math.ceil(over));
    } else {
      lookup = new Array(Math.ceil(over));
    }

    sway = sway || false;

    if (from === to) {
      fn = function (scrollPos) { return from; }
    } else if (sway) {
      fn = function (scrollPos) {
        scrollPos -= delay;

        if (scrollPos <= 0 || scrollPos >= over) { return from; }

        if (!!lookup[scrollPos]) {
          return lookup[scrollPos] / 100;
        }

        var a = to - from,
            b = over / 2;

        // Return a parabole that goes through (0,0) (returning `from`)
        // with its peak at x = over / 2 (returning `to`)
        lookup[scrollPos] = Math.round(from + (-1 * (a / (b * b)) * ((scrollPos - b) * (scrollPos - b)) + a) * 100);

        return lookup[scrollPos] / 100;
      }
    } else {
      fn = function (scrollPos) {
        scrollPos -= delay;

        if (scrollPos <= 0) { return from; }
        if (scrollPos >= over) { return to; }

        if (!!lookup[scrollPos]) {
          return lookup[scrollPos] / 100;
        }

        // Return a line going through (0,0) (returning `from`)
        // and through x = over returning `to`
        var v = Math.round((from + (to - from) * scrollPos / over) * 100);
        lookup[scrollPos] = Math.round((from + (to - from) * scrollPos / over) * 100);
        return lookup[scrollPos] / 100;
      }
    }

    if (from !== to) {
      for (var i = delay; i <= delay + over; i++) {
        fn(i);
      }
    }

    return fn;
  };

  /**
   * Build a function that takes a scroll position and returns the current value for a certain property
   * Compare it to a simple algebra function like y = 2x where x would be the scroll position
   *
   * @param  {int|string} to      Maximum property value (scrollPos = max)
   * @param  {int} over           Maximum scrolling distance
   * @param  {int} delay          Scrolling distance to wait before scrolling
   * @return {Function}           Funtion that takes current scroll position as an argument and returns the property value
   */
  ScrollBinder.prototype.buildToggleClassFunction = function (to, over, delay) {
    return function (scrollPos, element) {
      var newValue;

      scrollPos -= delay;
      scrollPos = (scrollPos < 0) ? 0 : scrollPos;

      if (scrollPos > 0 && scrollPos <= over) {
        if (element.className.indexOf(to) === -1) {
          element.className = element.className + ' ' + to;
        }
      } else if (element.className.indexOf(to) > -1) {
        var regex = new RegExp('\s*' + to + '\s*', 'i');
        element.className = element.className.replace(regex, '');
      }
    };
  };

  /**
   * Build a function that takes a scroll position and returns the current value for a certain property
   * Compare it to a simple algebra function like y = 2x where x would be the scroll position
   *
   * @param  {int|string} to      Maximum property value (scrollPos = max)
   * @param  {int} over           Maximum scrolling distance
   * @param  {int} delay          Scrolling distance to wait before scrolling
   * @return {Function}           Funtion that takes current scroll position as an argument and returns the property value
   */
  ScrollBinder.prototype.buildLockFunction = function (over, delay, element) {
    var $element = $(element),
        original = {
          left: $element.offset().left,
          width: $element.outerWidth(),
          top: $element.position().top,
        },
        offsetParent = {
          left: $element.offsetParent().offset().left
        },
        fixedTop = 0;

    return function (scrollPos) {
      var newValue;

      scrollPos -= delay;
      scrollPos = (scrollPos < 0) ? 0 : scrollPos;

      if ((scrollPos <= 0 || scrollPos > over) && !!$element.data('is-locked')) {
        var left  = original.left,
            width = original.width,
            top   = original.top;

        if (scrollPos > over) {
          top += over;
          $element.attr('style', '').css({ position: 'absolute', top: top });
        } else {
          $element.attr('style', '');
        }

        $element.data('is-locked', false);
      } else if (scrollPos > 0 && scrollPos < over && !$element.data('is-locked')) {
        var left  = original.left,
            width = original.width,
            top   = fixedTop || ($element.offset().top + scrollPos);

        if (!fixedTop) {
          fixedTop = top;
        }

        $element.css({ position: 'fixed', left: left, width: width, top: fixedTop, bottom: 'auto', right: 'auto', margin: 0 });
        $element.data('is-locked', true);
      }
    };
  };

  ScrollBinder.prototype.requestFrame = (function () {
    return window.requestAnimationFrame       ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame    ||
           function (callback) {
             window.setTimeout(callback, 1000 / 60);
           };
  })();

  ScrollBinder.prototype.cancelFrame = (function () {
    return window.cancelAnimationFrame       ||
           window.webkitCancelAnimationFrame ||
           window.mozCancelAnimationFrame    ||
           window.clearTimeout;
  })();

  /**
   * Animate all properties to their correct values for the given scrolling position
   * @param  {int} scrollPos
   * @return {void}
   */
  ScrollBinder.prototype.animate = function (scrollPos) {
    var self = this;

    // Loop over all selectors
    for (var i = 0; i < this.animations.length; i++) {
      var selector = this.animations[i];

      for (var j = 0; j < selector.length; j++) {
        var animation = selector[j],
            transformStack = {},
            css = {};

        // Loop all properties for the current selector
        for (var property in animation.properties) {
          if (animation.properties.hasOwnProperty(property)) {
            var value = animation.properties[property],
                transformString = '';

            // Transforms get temporarily stored in a stack because
            // we'll have to merge them into a single string to work
            if (value.isTransform) {
              transformStack[property] = value.fn(scrollPos) + value.unit;
            } else if (value.isClass) {
              value.fn(scrollPos, animation.element);
            } else if (value.isLock) {
              value.fn(scrollPos);
            } else {
              css[property] = value.fn(scrollPos) + value.unit;
            }
          }
        }

        // If one of the properties was a transform,
        // build a transform string like
        // scale(2.3) translateX(20px)
        for (var transformProperty in transformStack) {
          if (transformStack.hasOwnProperty(transformProperty)) {
            transformString += transformProperty + '(' + transformStack[transformProperty] + ') ';
          }
        }

        css['-webkit-transform'] = css['-ms-transform'] = css['transform'] = transformString;

        animation.$element.css(css);
      }
    }

    // Re-enable scroll detection when done
    setTimeout(function() {
      self.scrollFlag = true;
    }, 16);
  };

  /**
   * Handle scroll event
   * @return {void}
   */
  ScrollBinder.prototype.onScroll = function (e, fromScrollEnd) {
    var self = this;

    // scrollFlag throttles the requests
    if (this.scrollFlag === false) {
      return;
    }

    // scrollEnd gets triggered after last scroll event
    // since we're in a new scroll event, clear the one from the previous
    clearTimeout(self.scrollEnd);

    // Disable scroll listening
    this.scrollFlag = false;

    // Animate all properties
    this.animate(this.scrollTarget.scrollTop);

    if (!fromScrollEnd) {
      this.scrollEnd = setTimeout(function () {
        self.onScroll(e, true);
      }, 64);
    }
  };

  window.ScrollBinder = ScrollBinder;

}(jQuery, window, document, undefined));
