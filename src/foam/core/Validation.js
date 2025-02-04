/**
 * @license
 * Copyright 2016 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core',
  name: 'ValidationPredicate',

  properties: [
    {
      class: 'String',
      name: 'query'
    },
    {
      class: 'StringArray',
      name: 'args'
    },
    {
      class: 'Function',
      // TODO: it isn't normal for JS functions to have a 'js' prefix
      // TODO: poor choice of name, should be something with 'assert'
      name: 'jsFunc',
      expression: function(query, jsErr) {
        return function(obj) {
          var predicate = foam.mlang.predicate.FScript.create({query: query, prop: this});
          if ( ! predicate.f(obj) ) {
            const prop = this.forClass_ + '.' + foam.String.constantize(this.name);
            console.debug(prop, 'validation failed:', query)
            return jsErr(obj);
          }
        };
      }
    },
    {
      class: 'String',
      name: 'errorMessage',
      documentation: `
        Provide feedback to the user via a Message.
        To use this, provide the name of the Message you wish to add.
        When both errorString and errorMessage are specified, the errorMessage will be used.
      `
    },
    {
      class: 'String',
      name: 'errorString',
      // TODO: make deprecated, makes i18n difficult
      documentation: `
        Provide feedback to the user via a String.
        When both errorString and errorMessage are specified, the errorMessage will be used.
      `
    },
    {
      class: 'Function',
      // TODO: it isn't normal for JS functions to have a 'js' prefix
      name: 'jsErr',
      expression: function(errorString, errorMessage) {
        return function(obj) {
          if ( errorMessage && obj ) {
            if ( obj[errorMessage] ) return obj[errorMessage];
            console.warn('Error finding message', errorMessage, '. No such message on object.', obj);
          }
          return errorString;
        }
      }
    }
  ],

  methods: [
    function createErrorSlotFor(data) {
      return data.slot(this.jsFunc, this.args);
      /*
      return this.ExpressionSlot.create({
        args: this.args.map(a => data[a+'$' ]),
        code: this.jsFunc.bind(data)
      });
      */
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'PropertyValidationRefinement',
  refines: 'foam.core.Property',

  messages: [
    { name: 'REQUIRED', message: 'Required' }
  ],

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.ValidationPredicate',
      name: 'validationPredicates',
      // We override 'compare' here because we need to avoid infinite recursion
      // that occurs when a validation predicate for a given property contains a
      // reference to the property itself.
      // This is an incorrect implementation of compare since it will always
      // return a match, even if the validation predicates are different. It
      // would be preferable to find a way to deal with circular references.
      compare: function() { return 0; }
    },
    {
      name: 'validateObj',
      factory: function(prop) {
      var name     = this.name;
      var label    = this.label;
      var required = this.required;
      var self_    = this;
      var validationPredicates = this.validationPredicates;
      if ( validationPredicates.length ) {
        var args = foam.Array.unique(validationPredicates
          .map(vp => vp.args)
          .flat());
        return [args, function() {
          if ( required && self_.isDefaultValue(this[name]) ) {
            return `${self_.REQUIRED}`;
          }
          for ( var i = 0 ; i < validationPredicates.length ; i++ ) {
            var vp   = validationPredicates[i];
            var self = this;
            if ( vp.jsFunc.call(self_, this) ) return vp.jsErr.call(self, self);
          }
          return null;
        }];
      }
      return ! required ? null : [[name],
        function() {
          const axiom = this.cls_.getAxiomByName(name);
          return axiom.isDefaultValue(this[name]) && self_.REQUIRED;
          // TODO: normalise all reqired-esque predicates to use the same message, currently split between "<prop> required" and "Please enter <prop>"
        }];
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'StringPropertyValidationRefinement',
  refines: 'foam.core.String',

  messages: [
    { name: 'REQUIRED',        message: 'Required' },
    { name: 'SHOULD_BE_LEAST', message: 'should be at least' },
    { name: 'SHOULD_BE_MOST',  message: 'should be at most' },
    { name: 'CHARACTER',       message: 'character' },
    // To be populated by locale where required
    { name: 'LOCALE_VALIDATION_REGEX', message: '' },
    { name: 'LOCALE_VALIDATION_ERROR_MESSAGE', message: '' }
  ],

  properties: [
    'minLength',
    'maxLength',
    {
      class: 'FObjectArray',
      of: 'foam.core.ValidationPredicate',
      name: 'validationPredicates',
      adapt: function(o, a, prop) {
        a = foam.core.FObjectArray.ADAPT.value.call(this, o, a, prop);
        if ( ! this.localeValidationPredicate || a.find(v => v == this.localeValidationPredicate ) ) {
          return a;
        }
        a.unshift(this.localeValidationPredicate);
        return a;
      },
      factory: function() {
        var self = this;
        var a    = [];

        if ( foam.Number.isInstance(this.minLength) ) {
          a.push({
            args: [this.name],
            query: 'thisValue.len>='+self.minLength,
            errorString: `${this.label} ${foam.core.String.SHOULD_BE_LEAST} ${this.minLength} ${foam.core.String.CHARACTER}${this.minLength>1?'s':''}`
          });
        }

        if ( foam.Number.isInstance(this.maxLength) ) {
          a.push({
            args: [this.name],
            query: this.name+'.len<='+self.maxLength,
            errorString: `${this.label} ${foam.core.String.SHOULD_BE_MOST} ${this.maxLength} ${foam.core.String.CHARACTER}${this.maxLength>1?'s':''}`
          });
        }
        return a;
      }
    },
    {
      class: 'FObjectProperty',
      of: 'foam.core.ValidationPredicate',
      name: 'localeValidationPredicate',
      factory: function() {
        if ( ! foam.core.String.LOCALE_VALIDATION_REGEX ) return null;
        return {
          args: [this.name],
          query: this.name + '!exists||' + this.name + '~' + foam.core.String.LOCALE_VALIDATION_REGEX,
          errorString: `${this.label} ${foam.core.String.LOCALE_VALIDATION_ERROR_MESSAGE}`
        };
      }
    }
  ],
  methods: [
    function init() {
      // Needed for props that override the default validateObj
      // Clearing required to recheck predicate on property clone
      this.clearProperty('localeValidationPredicate')
      if ( this.hasOwnProperty('validateObj') && this.localeValidationPredicate ) {
        let currValidate = this.validateObj;
        let vp = this.localeValidationPredicate;
        // Duplicates code from original ValidateObj
        let self_ = this;
        let args = [];
        let validateFn = currValidate;
        if ( typeof currValidate === 'function' ) {
          // Break apart old validate into args and code
          args = foam.Function.argNames(currValidate) || [];
        } else if ( Array.isArray(currValidate) ) {
          [ args, validateFn ] = currValidate;
        } else {
          args = [];
        }
        let allArgs = foam.Array.unique([...vp.args, ...args]);
        // set the hijacked validate
        this.validateObj = [allArgs, function() {;
          var self = this;
          if ( vp.jsFunc.call(self_, this) ) return vp.jsErr.call(this, this);
          return validateFn?.apply(this, args.map(function(a) {
            return self[a];
          }));
        }];
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'FObjectPropertyValidationRefinement',
  refines: 'foam.core.FObjectProperty',

  messages: [
    { name: 'PLEASE_ENTER_VALID', message: 'Please enter valid' }
  ],

  properties: [
    {
      class: 'Boolean',
      name: 'autoValidate'
    },
    {
      name: 'validateObj',
      expression: function(name, label, required, validationPredicates, autoValidate) {
        if ( autoValidate ) {
          var self = this;
          return [
            [`${name}$errors_`],
            function(errs) {
              return errs ? `${self.PLEASE_ENTER_VALID} ${(label || name).toLowerCase()}` : null;
            }
          ];
        }
        return foam.core.Property.VALIDATE_OBJ.factory.apply(this, this.VALIDATE_OBJ);
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'FObjectArrayValidationRefinement',
  refines: 'foam.core.FObjectArray',

  messages: [
    { name: 'PLEASE_ENTER_VALID', message: 'Please enter valid' }
  ],

  properties: [
    {
      class: 'Boolean',
      name: 'autoValidate',
      documentation: `
        Enables default implementation for validateObj on this array property,
        which will invalidate the property when any FObject array element is
        invalid.
      `
    },
    {
      name: 'validateObj',
      expression: function(name, label, required, validationPredicates, autoValidate) {
        if ( autoValidate ) {
          var self = this;
          return [
            [`${name}$errors`],
            function(errs) {
              return errs ? `${self.PLEASE_ENTER_VALID} ${(label || name).toLowerCase()}` : null;
            }
          ];
        }
        return foam.core.Property.VALIDATE_OBJ.factory.apply(this, this.VALIDATE_OBJ);
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'IntPropertyValidationRefinement',
  refines: 'foam.core.Int',

  properties: [
    {
      class: 'Boolean',
      name: 'autoValidate'
    },
    {
      name: 'validationPredicates',
      factory: function() {
        if ( ! this.autoValidate ) return [];
        var self = this;
        var a    = [];
        if ( foam.Number.isInstance(self.min) ) {
          a.push({
            args: [self.name],
            query: self.name+">="+self.min,
            errorString: `Please enter ${self.label.toLowerCase()} greater than or equal to ${self.min}.`
          });
        }

        if ( foam.Number.isInstance(self.max) ) {
          a.push({
            args: [self.name],
            query: self.name+"<="+self.max,
            errorString: `Please enter ${self.label.toLowerCase()} less than or equal to ${self.max}`
          });
        }

        return a;
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core.internal',
  name: 'Errors',

  documentation: `
    A psedo-Property Axiom added to FObject which contains an object's validation errors.
    Adds the following attributes to an Object:
    <dl>
      <dt>errors_</dt><dd>list of current errors</dd>
      <dt>errors_$</dt><dd>Slot representation of errors_</dd>
      <dt>validateObject()</dt><dd>calls the validateObj() method of all property Axioms, allowing them to populate errors_</dd>
    </dl>
  `,

  properties: [
    [ 'name', 'errors_' ]
  ],

  methods: [
    function installInProto(proto) {
      var self = this;
      Object.defineProperty(proto, 'errors_', {
        get: function() {
          return self.toSlot(this).get();
        },
        configurable: true,
        enumerable:   false
      });

      Object.defineProperty(proto, 'errors_$', {
        get: function() {
          return self.toSlot(this);
        },
        configurable: true,
        enumerable:   false
      });
    },

    function toSlot(obj) {
      var slotName = this.slotName_ || ( this.slotName_ = this.name + '$' );
      var slot     = obj.getPrivate_(slotName);

      if ( ! slot ) {
        slot = this.createErrorSlot_(obj)
        obj.setPrivate_(slotName, slot);
      }

      return slot;
    },

    function createErrorSlot_(obj) {
      var args = [];
      var ps   = obj.cls_.getAxiomsByClass(foam.core.Property).
        filter(function(a) { return a.validateObj; });

      for ( var i = 0 ; i < ps.length ; i++ ) {
        var p = ps[i];
        args.push(obj.slot(p.validateObj));
      }

      function validateObject() {
        var ret;

        for ( var i = 0 ; i < ps.length ; i++ ) {
          var p   = ps[i];
          var err = args[i].get();
          if ( err ) (ret || (ret = [])).push([p, err]);
        }

        return ret;
      }

      return foam.core.ExpressionSlot.create({
        obj:  obj,
        code: validateObject,
        args: args
      });
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'ValidationFObjectRefinement',
  refines: 'foam.core.FObject',

  axioms: [
    foam.core.internal.Errors.create()
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'EmailPropertyValidationRefinement',
  refines: 'foam.core.EMail',

  messages: [
    { name: 'EMAIL_REQUIRED',       message: 'Email address required' },
    { name: 'VALID_EMAIL_REQUIRED', message: 'Valid email address required' }
  ],

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.ValidationPredicate',
      name: 'validationPredicates',
      factory: function() {
        var self = this;
        var ret = [];
        if ( this.required ) {
          ret.push(
            {
              args: [this.name],
              query: this.name + '!=""',
              errorString: this.EMAIL_REQUIRED
            }
          );
        }
        ret.push(
          {
            args: [this.name],
            query: this.name + '==""||' + this.name + '~/\\S+@\\S+\\.\\S+/',
            errorString: this.VALID_EMAIL_REQUIRED
          }
        );
        return ret;
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'PhoneNumberPropertyValidationRefinement',
  refines: 'foam.core.PhoneNumber',

  messages: [
    { name: 'PHONE_NUMBER_REQUIRED', message: 'Required' },
    { name: 'INVALID_PHONE_NUMBER',  message: 'Valid phone number required' },
    { name: 'INVALID_CHARACTER',     message: 'Phone Number can only contain numbers' }
  ],

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.ValidationPredicate',
      name: 'validationPredicates',
      factory: function() {
        var self = this;
        return [
          {
            args: [this.name],
            query:
              this.name + ' !exists||' +
              this.name + '~' + foam.nanos.auth.Phone.ALPHA_CHAR_CHECK,
            errorString: this.INVALID_CHARACTER
          },
          {
            args: [this.name],
            query:
              this.name + ' !exists||' +
              this.name + '~' + foam.nanos.auth.Phone.PHONE_NUMBER_REGEX,
            errorString: this.INVALID_PHONE_NUMBER
          }
        ];
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'DatePropertyValidationRefinement',
  refines: 'foam.core.Date',

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.ValidationPredicate',
      name: 'validationPredicates',
      factory: function() {
        var self = this;
        return [
          {
            args: [self.name],
            query: 'thisValue !exists||thisValue<=' + foam.Date.MAX_DATE.toISOString().slice(1,16) + '&&thisValue>=' + foam.Date.MIN_DATE.toISOString().slice(0,16),
            errorString: 'Invalid date value'
          }
        ];
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'URLValidationRefinement',
  refines: 'foam.core.URL',

  messages: [
    { name: 'INVALID_URL', message: 'Invalid URL' }
  ],

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.ValidationPredicate',
      name: 'validationPredicates',
      factory: function() {
        var self = this;
        var urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;
        return [
          {
            args: [this.name],
            query: 'thisValue==""||thisValue~' + urlRegex,
            errorString: this.INVALID_URL
          }
        ];
      }
    }
  ]
});


foam.CLASS({
  package: 'foam.core',
  name: 'WebsiteValidationRefinement',
  refines: 'foam.core.Website',

  messages: [
    { name: 'INVALID_Website', message: 'Invalid Website' }
  ],

  properties: [
    {
      class: 'FObjectArray',
      of: 'foam.core.ValidationPredicate',
      name: 'validationPredicates',
      factory: function() {
        var self = this;
        var websiteRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/;
        return [
          {
            args: [this.name],
            query: 'thisValue==""||thisValue~' + websiteRegex,
            errorString: this.INVALID_WEBSITE
          }
        ];
      }
    }
  ]
});
