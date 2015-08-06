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

    // @fixme - These two should not be public
    this.scrollFlag = true;
    this.scrollEnd = null;

    // @todo - More extensive or other solution
    this.transforms = ['scale', 'scaleX', 'scaleY', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'translateX', 'translateY'];

    this.init().bind();
  }

  /**
   * Init everything
   * @return {ScrollBinder} Instance for chainability
   */
  ScrollBinder.prototype.init = function () {
    this.initAnimations();
    this.animate($(window).scrollTop());
    return this;
  };

  /**
   * Bind all event handlers for this module
   * @return {ScrollBinder} Instance for chainability
   */
  ScrollBinder.prototype.bind = function () {
    var self = this,
        overflow = this.$element.css('overflow-y'),
        $scrollTarget = $(window);

    this.loop = function () {
      self.requestFrame.call(window, function () {
        var scrollingPosition = $scrollTarget.scrollTop();

        if (scrollingPosition !== self.currentScrollingPosition) {
          self.onScroll();
        }

        self.currentScrollingPosition = scrollingPosition;

        self.loop();
      });
    };

    if (overflow === 'auto' || overflow ==='scroll') {
      $scrollTarget = this.$element;
    }

    this.loop();

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
                properties = animation.properties;

            for (var property in properties) {
              if (properties.hasOwnProperty(property)) {
                $element.css(property, '');
              }
            }

            $element.css({
              '-webkit-transform': '',
              '-ms-transform'    : '',
              'transform'        : ''
            });
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
    self.loop = function () { };

    return this;
  };

  /**
   * Initialize all animations from user input to usable objects
   * @return {Object} All initiated animations
   */
  ScrollBinder.prototype.initAnimations = function () {
    var initAnimations = {};

    // Loop all selectors
    for (var selector in this.animations) {
      if (this.animations.hasOwnProperty(selector)) {
        var initSelector = this.initSelector(selector, this.animations[selector]);

        if (!!initSelector) {
          initAnimations[selector] = initSelector;
        }
      }
    }

    // Override user specified animations with initialized animations
    this.animations = initAnimations;

    return this.animations;
  };

  ScrollBinder.prototype.initSelector = function (selector, properties) {
    var self = this,
        $elements = [],
        matches = [];

    // Cache the targeted element
    // We can select the parent element by using this instead of a selector
    if (selector === 'this') {
      $elements = this.$element;
    } else {
      $elements = this.$element.find(selector);
    }

    if ($elements.length === 0) {
      return false;
    }

    $elements.each(function () {
      // Create a new object that will hold all initialized values
      var init = { init: true, $element: null, properties: {} };
      init.$element = $(this);

      // Loop all CSS properties for current selector
      for (var property in properties) {
        if (properties.hasOwnProperty(property)) {
          init.properties[property] = self.initProperty(property, properties[property], init.$element);
        }
      }

      matches.push(init);
    });

    return matches;
  };

  ScrollBinder.prototype.initProperty = function (property, value, $element) {
    var isTransform  = ($.inArray(property, this.transforms) !== -1),
        isClass      = (property === 'class'),
        defaultValue = parseFloat($element.css(property)),
        from         = value.from,
        to           = value.to,
        over         = value.over || this.scrollDistance,
        delay        = value.delay || this.scrollDelay,
        unit         = (typeof value.unit === 'string') ? value.unit : ((!!isTransform) ? '' : 'px'),
        viewport     = (typeof value.viewport === 'undefined') ? false : true;

    defaultValue = isNaN(defaultValue) ? 0 : defaultValue;

    from = (typeof from === 'undefined') ? defaultValue : from;
    to   = (typeof to === 'undefined') ? defaultValue : to;

    if (over === 'viewport') {
      over = (window.innerHeight - 2 * delay);
    }

    if (!!viewport) {
      delay += ($element.offset().top - window.innerHeight);
    }

    // Construct the animation function for this property and attach it to the initialized object
    return {
      fn: (isClass) ? this.buildToggleClassFunction(to, over, delay) : this.buildPropertyFunction(from, to, over, delay),
      isTransform: isTransform,
      isClass: isClass,
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
  ScrollBinder.prototype.buildPropertyFunction = function(from, to, over, delay) {
    return function (scrollPos) {
      var newValue;

      if (over === 'viewport') {
        over = window.innerHeight;
      }

      scrollPos -= delay;
      scrollPos = (scrollPos < 0) ? 0 : scrollPos;

      newValue = Math.round((from + (to - from) * scrollPos / over) * 100 ) / 100;

      // Force newValue between from and to (if check is for negative numbers (like between -55 and -10))
      if (from < to) {
        newValue = (newValue < from) ? from : (newValue > to) ? to : newValue;
      } else {
        newValue = (newValue > from) ? from : (newValue < to) ? to : newValue;
      }

      return newValue;
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
  ScrollBinder.prototype.buildToggleClassFunction = function (to, over, delay) {
    return function (scrollPos, $element) {
      var newValue;

      if (over === 'viewport') {
        over = window.innerHeight;
      }

      scrollPos -= delay;
      scrollPos = (scrollPos < 0) ? 0 : scrollPos;

      $element.toggleClass(to, (scrollPos > 0 && scrollPos <= over));
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

  /**
   * Animate all properties to their correct values for the given scrolling position
   * @param  {int} scrollPos
   * @return {void}
   */
  ScrollBinder.prototype.animate = function(scrollPos) {
    var self = this;

    // Loop over all selectors
    for (var selector in self.animations) {
      if (self.animations.hasOwnProperty(selector)) {
        var animations = self.animations[selector];

        for (var i = 0; i < animations.length; i++) {
          var animation = animations[i],
              transformStack = {};

          // Loop all properties for the current selector
          for (var property in animation.properties) {
            if (animation.properties.hasOwnProperty(property)) {
              var value = animation.properties[property];

              // Transforms get temporarily stored in a stack because
              // we'll have to merge them into a single string to work
              if (!!value.isTransform) {
                transformStack[property] = value.fn(scrollPos) + value.unit;
              } else if (!!value.isClass) {
                value.fn(scrollPos, animation.$element);
              } else {
                animation.$element.css(property, value.fn(scrollPos) + value.unit);
              }
            }
          }

          // If one of the properties was a transform,
          // build a transform string like
          // scale(2.3) translateX(20px)
          if (!$.isEmptyObject(transformStack)) {
            var transformString = '';

            for (var transformProperty in transformStack) {
              if (transformStack.hasOwnProperty(transformProperty)) {
                transformString += transformProperty + '(' + transformStack[transformProperty] + ') ';
              }
            }

            animation.$element.css({
              '-webkit-transform': transformString,
              '-ms-transform'    : transformString,
              'transform'        : transformString
            });
          }
        }
      }
    }
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
    this.animate(this.$element.scrollTop());

    // Once per 16ms (= 1 frame at 60fps)
    setTimeout(function () {
      self.scrollFlag = true;
    }, 16);

    if (!fromScrollEnd) {
      this.scrollEnd = setTimeout(function () {
        self.onScroll(e, true);
      }, 64);
    }
  };

  window.ScrollBinder = ScrollBinder;

}(jQuery, window, document, undefined));
