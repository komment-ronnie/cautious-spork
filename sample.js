
$u = _.noConflict();

/**
 * make the code below compatible with browsers without
 * an installed firebug like debugger
if (!window.console || !console.firebug) {
  var names = ["log", "debug", "info", "warn", "error", "assert", "dir",
    "dirxml", "group", "groupEnd", "time", "timeEnd", "count", "trace",
    "profile", "profileEnd"];
  window.console = {};
  for (var i = 0; i < names.length; ++i)
    window.console[names[i]] = function() {};
}
 */


jQuery.urldecode = function(x) {
  return decodeURIComponent(x).replace(/\+/g, ' ');
};


jQuery.urlencode = encodeURIComponent;

jQuery.getQueryParameters = function(s) {
  if (typeof s === 'undefined')
    s = document.location.search;
  var parts = s.substr(s.indexOf('?') + 1).split('&');
  var result = {};
  for (var i = 0; i < parts.length; i++) {
    var tmp = parts[i].split('=', 2);
    var key = jQuery.urldecode(tmp[0]);
    var value = jQuery.urldecode(tmp[1]);
    if (key in result)
      result[key].push(value);
    else
      result[key] = [value];
  }
  return result;
};


jQuery.fn.highlightText = function(text, className) {
  /**
   * @description Searches for a specified text within an HTML node or its child nodes
   * and wraps it with a `<span>` element if found. It also adds an SVG rectangle around
   * the highlighted area if the node is within an SVG element.
   * 
   * @param {Node} node - Used to process elements in an HTML document.
   * 
   * @param {(object)[]} addItems - Used to accumulate additional highlighting items.
   */
  function highlight(node, addItems) {
    if (node.nodeType === 3) {
      var val = node.nodeValue;
      var pos = val.toLowerCase().indexOf(text);
      if (pos >= 0 &&
          !jQuery(node.parentNode).hasClass(className) &&
          !jQuery(node.parentNode).hasClass("nohighlight")) {
        var span;
        var isInSVG = jQuery(node).closest("body, svg, foreignObject").is("svg");
        if (isInSVG) {
          span = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        } else {
          span = document.createElement("span");
          span.className = className;
        }
        span.appendChild(document.createTextNode(val.substr(pos, text.length)));
        node.parentNode.insertBefore(span, node.parentNode.insertBefore(
          document.createTextNode(val.substr(pos + text.length)),
          node.nextSibling));
        node.nodeValue = val.substr(0, pos);
        if (isInSVG) {
          var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          var bbox = node.parentElement.getBBox();
          rect.x.baseVal.value = bbox.x;
          rect.y.baseVal.value = bbox.y;
          rect.width.baseVal.value = bbox.width;
          rect.height.baseVal.value = bbox.height;
          rect.setAttribute('class', className);
          addItems.push({
              "parent": node.parentNode,
              "target": rect});
        }
      }
    }
    else if (!jQuery(node).is("button, select, textarea")) {
      jQuery.each(node.childNodes, function() {
        // Loops and highlights child nodes.

        highlight(this, addItems);
      });
    }
  }
  var addItems = [];
  var result = this.each(function() {
    // Executes a callback function on each item in the collection.

    highlight(this, addItems);
  });
  for (var i = 0; i < addItems.length; ++i) {
    jQuery(addItems[i].parent).before(addItems[i].target);
  }
  return result;
};

if (!jQuery.browser) {
  jQuery.uaMatch = function(ua) {
    ua = ua.toLowerCase();

    var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
      /(webkit)[ \/]([\w.]+)/.exec(ua) ||
      /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
      /(msie) ([\w.]+)/.exec(ua) ||
      ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
      [];

    return {
      browser: match[ 1 ] || "",
      version: match[ 2 ] || "0"
    };
  };
  jQuery.browser = {};
  jQuery.browser[jQuery.uaMatch(navigator.userAgent).browser] = true;
}

var Documentation = {

  /**
   * @description Initializes various components of an application, including fixing a
   * Firefox anchor bug, highlighting search words, and initializing an index table.
   * If navigation with keys is enabled, it also sets up key listeners for navigation.
   */
  init : function() {
    this.fixFirefoxAnchorBug();
    this.highlightSearchWords();
    this.initIndexTable();
    if (DOCUMENTATION_OPTIONS.NAVIGATION_WITH_KEYS) {
      this.initOnKeyListeners();
    }
  },

  TRANSLATIONS : {},
  PLURAL_EXPR : function(n) { return n === 1 ? 0 : 1; },
  LOCALE : 'unknown',

  // gettext and ngettext don't access this so that the functions
  // can safely bound to a different name (_ = Documentation.gettext)
  /**
   * @description Translates a given string using the `Documentation.TRANSLATIONS`
   * object. If no translation is found, it returns the original string. If multiple
   * translations are available, it selects the first one.
   * 
   * @param {string} string - Used to translate.
   * 
   * @returns {string | object} Either a string translation if available or the first
   * element of an array translation if available. If no translation is found, it returns
   * the original input string.
   */
  gettext : function(string) {
    var translated = Documentation.TRANSLATIONS[string];
    if (typeof translated === 'undefined')
      return string;
    return (typeof translated === 'string') ? translated : translated[0];
  },

  /**
   * @description Translates a string to a specific number (singular or plural) based
   * on a dictionary and a number n, returning the corresponding translated string. If
   * no translation exists for the singular form, it falls back to using the plural
   * form if n is not 1.
   * 
   * @param {string} singular - Used to specify a singular translation key.
   * 
   * @param {string} plural - Used for plural form of the message.
   * 
   * @param {number} n - 1-based count of an item or quantity.
   * 
   * @returns {string} Either the singular form if `n` is equal to 1, or the plural
   * form if `n` is not equal to 1, and a translated version based on the plural
   * expression in case a translation is found.
   */
  ngettext : function(singular, plural, n) {
    var translated = Documentation.TRANSLATIONS[singular];
    if (typeof translated === 'undefined')
      return (n == 1) ? singular : plural;
    return translated[Documentation.PLURALEXPR(n)];
  },

  /**
   * @description Initializes a translation catalog, storing message keys and values
   * in the `TRANSLATIONS` object. It also compiles a pluralization expression from the
   * provided string and sets the current locale. This function prepares the application
   * for internationalization (i18n) by populating its translation data.
   * 
   * @param {object} catalog - Used to store translations for an application.
   */
  addTranslations : function(catalog) {
    for (var key in catalog.messages)
      this.TRANSLATIONS[key] = catalog.messages[key];
    this.PLURAL_EXPR = new Function('n', 'return +(' + catalog.plural_expr + ')');
    this.LOCALE = catalog.locale;
  },

  /**
   * @description Adds a permalink link to each header element (H1-H6) and definition
   * term that has an ID, allowing users to quickly navigate back to these specific
   * elements within the content.
   */
  addContextElements : function() {
    $('div[id] > :header:first').each(function() {
      // Creates and appends permalinks to div headers.

      $('<a class="headerlink">\u00B6</a>').
      attr('href', '#' + this.id).
      attr('title', _('Permalink to this headline')).
      appendTo(this);
    });
    $('dt[id]').each(function() {
      // Creates and appends an anchor element to each 'dt' element with an ID attribute.

      $('<a class="headerlink">\u00B6</a>').
      attr('href', '#' + this.id).
      attr('title', _('Permalink to this definition')).
      appendTo(this);
    });
  },

  /**
   * @description Fixes a bug in Firefox where clicking on an anchor link causes the
   * URL to jump to the top. It adds an empty fragment (`''`) to the URL after a short
   * delay, effectively canceling the jump and retaining the original anchor position.
   */
  fixFirefoxAnchorBug : function() {
    if (document.location.hash && $.browser.mozilla)
      window.setTimeout(function() {
        // Reloads the page.

        document.location.href += '';
      }, 10);
  },

  /**
   * @description Highlights search terms within a web page's body content, using query
   * parameters to determine which terms to highlight. It also adds a link to hide the
   * highlighted text. The highlighting is delayed by 10 milliseconds to allow the page
   * to load fully.
   */
  highlightSearchWords : function() {
    var params = $.getQueryParameters();
    var terms = (params.highlight) ? params.highlight[0].split(/\s+/) : [];
    if (terms.length) {
      var body = $('div.body');
      if (!body.length) {
        body = $('body');
      }
      window.setTimeout(function() {
        // Highlights text.

        $.each(terms, function() {
          // Loops through each item in an array and highlights it in a text body.

          body.highlightText(this.toLowerCase(), 'highlighted');
        });
      }, 10);
      $('<p class="highlight-link"><a href="javascript:Documentation.' +
        'hideSearchWords()">' + _('Hide Search Matches') + '</a></p>')
          .appendTo($('#searchbox'));
    }
  },

  /**
   * @description Initializes click event handlers for images with class "toggler" and
   * toggles the visibility of corresponding table rows. It also updates the image
   * source to switch between plus and minus icons. If a collapse option is enabled,
   * it simulates an initial click on each toggler.
   */
  initIndexTable : function() {
    var togglers = $('img.toggler').click(function() {
      // Toggles image and table row visibility.

      var src = $(this).attr('src');
      var idnum = $(this).attr('id').substr(7);
      $('tr.cg-' + idnum).toggle();
      if (src.substr(-9) === 'minus.png')
        $(this).attr('src', src.substr(0, src.length-9) + 'plus.png');
      else
        $(this).attr('src', src.substr(0, src.length-8) + 'minus.png');
    }).css('display', '');
    if (DOCUMENTATION_OPTIONS.COLLAPSE_INDEX) {
        togglers.click();
    }
  },

  /**
   * @description Fades out the elements with the class `highlight-link` within the
   * element with the ID `searchbox`, and removes the class `highlighted` from all
   * elements with the tag name `span`. This effectively hides any highlighted search
   * results.
   */
  hideSearchWords : function() {
    $('#searchbox .highlight-link').fadeOut(300);
    $('span.highlighted').removeClass('highlighted');
  },

  /**
   * @description Constructs a full URL by concatenating a predefined `URL_ROOT` and a
   * given `relativeURL`. This allows for generating URLs that are based on a common
   * root path, while keeping the relative path separate from the root.
   * 
   * @param {string} relativeURL - Used to create a full URL.
   * 
   * @returns {string} A URL composed of the concatenated strings `DOCUMENTATION_OPTIONS.URL_ROOT`,
   * `'/'`, and `relativeURL`. The returned string represents a complete URL.
   */
  makeURL : function(relativeURL) {
    return DOCUMENTATION_OPTIONS.URL_ROOT + '/' + relativeURL;
  },

  /**
   * @description Extracts a relative URL from a full URL by removing any '../' path
   * parts and returning the remaining part after the last slash.
   * 
   * @returns {string} The filename of the current URL without the file extension and
   * any trailing characters.
   */
  getCurrentURL : function() {
    var path = document.location.pathname;
    var parts = path.split(/\//);
    $.each(DOCUMENTATION_OPTIONS.URL_ROOT.split(/\//), function() {
      // Cleans URL path by removing parent directories.

      if (this === '..')
        parts.pop();
    });
    var url = parts.join('/');
    return path.substring(url.lastIndexOf('/') + 1, path.length - 1);
  },

  /**
   * @description Sets up keydown event listeners on the document element to navigate
   * through pages using left and right arrow keys when the focus is not on a specific
   * HTML elements (search box, textarea, dropdown or button). It checks for rel="prev"
   * and rel="next" links in the page and navigates accordingly.
   * 
   * @returns {boolean} Determined by the execution of the inner functions within the
   * event handlers.
   */
  initOnKeyListeners: function() {
    $(document).keydown(function(event) {
      // Handles arrow key navigation.

      var activeElementType = document.activeElement.tagName;
      // don't navigate when in search box, textarea, dropdown or button
      if (activeElementType !== 'TEXTAREA' && activeElementType !== 'INPUT' && activeElementType !== 'SELECT'
          && activeElementType !== 'BUTTON' && !event.altKey && !event.ctrlKey && !event.metaKey
          && !event.shiftKey) {
        switch (event.keyCode) {
          case 37: // left
            var prevHref = $('link[rel="prev"]').prop('href');
            if (prevHref) {
              window.location.href = prevHref;
              return false;
            }
          case 39: // right
            var nextHref = $('link[rel="next"]').prop('href');
            if (nextHref) {
              window.location.href = nextHref;
              return false;
            }
        }
      }
    });
  }
};

// quick alias for translations
_ = Documentation.gettext;

$(document).ready(function() {
  // Initializes.

  Documentation.init();
});
