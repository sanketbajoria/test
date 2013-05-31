
;(function(_) {
	function executeQueue(queue,bottom){
    	var i = bottom?0:queue.length-1;
    	while((bottom && i<queue.length) ||(!bottom && i>=0)){
    		queue[i].apply(this);
    		i=bottom?i+1:i-1;
    	}
	}
	function extend(obj, fn) {
		var queue = obj[fn][fn+'chain'];
		if(!_.isUndefined(queue)){
			var queue = obj[fn][fn+'chain'] = []
			, childObj = obj;
			while (childObj) {
				queue.push(childObj[fn]);
				childObj = findSuper(fn, childObj);
			}
		}
		
	}
	function _super(fn) {
		 
	    // Keep track of how far up the prototype chain we have traversed,
	    // in order to handle nested calls to _super.
	    this._superObj || (this._superObj = {});
	    this._superObj[fn]  = findSuper(fn, this._superObj[fn] || this);
	 
	 	var result = this._superObj[fn][fn]; // Attribute. Maybe change the variable name.
		if (_.isFunction(result)) result = result.apply(this, _.rest(arguments));
	    delete this._superObj[fn];
	    return result;
	  }
	 
	  // Find the next object up the prototype chain that has a
	  // different implementation of the method.
	  function findSuper(fn, childObject) {
	    var object = childObject;
	    while (object[fn] === childObject[fn]) {
	      object = object.constructor.__super__;
	    }
	    return object;
	  }

_.each(["Model", "Collection", "View", "Router"], function(c) {
    Backbone[c].prototype._super = _super;
  });
})(_);
/**
 * Backbone.Validator
 *
 * Adds decoupled validator functionality that could be bound to model and view, as well as
 * validated plain hashes with built-in or custom validators
 *
 * @author Maksim Horbachevsky
 */
Backbone.Validator = (function(_){

  'use strict';

  var Validator = {


    /**
     * General validation method that gets attributes list and validations config and runs them all
     *
     * @param attrs
     * @param validations
     * @param {Object} [context] - validator execution context
     * @return {*} null if validation passed, errors object if not
     */
    validate: function(attrs, validations, context) {
      var errors = {};
      _.chain(attrs).each(function(attrValue, attrName) {
        var validation = validations[attrName];
        var error = this._validateAll(validation, attrName, attrValue, context);

        if (error.length) {
          errors[attrName] = _.uniq(error);
        }
      }, this);

      return _.size(errors) ? errors : null;
    },

    _validateAll: function(validations, attrName, attrValue, context) {
      context = context || this;

      return _.inject(_.flatten([validations || []]), function(errors, validation) {
        _.chain(validation).omit('message').each(function(attrExpectation, validatorName) {
          var validator = this._validators[validatorName];

          if (!validator) {
            throw new Error('Missed validator: ' + validatorName);
          }

          var result = validator.fn.apply(context, [attrValue, attrExpectation]);
          if (result !== true) {
            var error = validation.message ||
                result ||
                createErrorMessage(attrName, attrValue, attrExpectation, validatorName, context) ||
                validator.message ||
                'Invalid';

            if (_.isFunction(error)) {
              error = error.apply(context, [attrName, attrValue, attrExpectation, validatorName]);
            }

            errors.push(error);
          }
        }, this);

        return errors;
      }, [], this);
    },

    /**
     * Add validator into collection. Will throw error if try to override existing validator
     *
     *         Backbone.Validator.addValidator('minLength', function(value, expectation) {
     *           return value.length >= expectation;
     *         }, 'Field is too short');
     *
     * @param {String} validatorName - validator name
     * @param {Function} validatorFn - validation function
     * @param {String} [errorMessage] - error message
     */
    add: function(validatorName, validatorFn, errorMessage) {
      this._validators[validatorName] = {
        fn: validatorFn,
        message: errorMessage
      };
    },

    /**
     * Validators storage
     *
     * @private
     * @property _validators
     */
    _validators: {
    }
  };


  /**
   * Collection of methods that will be used to extend standard
   * view and model functionality with validations
   */
  Validator.Extensions = {

    View: {

      /**
       * Bind passed (or internal) model to the view with `validated` event, that fires when model is
       * being validated. Calls `onValidField` and `onInvalidField` callbacks depending on validity of
       * particular attribute
       *
       * @param {Backbone.Model} [model] - model that will be bound to the view
       * @param {Object} options - optional callbacks `onValidField` and `onInvalidField`. If not passed
       * will be retrieved from the view instance or global `Backbone.Validator.ViewCallbacks` object
       */
      bindValidation: function(model, options) {
        model = model || this.model;

        if (!model) {
          throw 'Model is not provided';
        }

        this.listenTo(model, 'validated', function(model, attributes, errors) {
          var callbacks = _.extend({}, _.pick(this, 'onInvalidField', 'onValidField'), options);
          errors = errors || {};

          _.each(attributes, function(value, name) {
            var attrErrors = errors[name];

            if (attrErrors && attrErrors.length && callbacks.onInvalidField) {
              callbacks.onInvalidField.call(this, name, value, attrErrors, model);
            } else if(callbacks.onInvalidField) {
              callbacks.onValidField.call(this, name, value, model);
            }
          }, this);
        });
      }
    },

    Model: {

      /**
       * Validation method called by Backbone's internal `#_validate()` or directly from model's instance
       *
       * @param {Object|Array} [attributes] - optional hash/array of attributes to validate
       * @param {Object} [options] - standard Backbone.Model's options list, including `suppress` option. When it's
       * set to true method will store errors into `#errors` property, but return null, so model seemed to be valid
       *
       * @return {null|Object} - null if model is valid, otherwise - collection of errors associated with attributes
       */
      validate: function(attributes, options) {
        var validation = _.result(this, 'validation') || {},
            attrs = getAttrsToValidate(this, attributes),
            errors = Validator.validate(attrs, validation, this);

        options = options || {};

        if (!options.silent) {
          _.defer(_.bind(this.triggerValidated, this), attrs, errors);
        }

        return options && options.suppress ? null : errors;
      },

      /**
       * Override Backbone's method to pass properly fetched attributes list
       * @private
       */
      _validate: function(attributes, options) {
        if (!options.validate || !this.validate) return true;
        var attrs = getAttrsToValidate(this, attributes),
            errors = this.validationError = this.validate(attrs, options) || null;

        if (errors) {
          this.trigger('invalid', this, errors, _.extend(options || {}, { validationError: errors }));
        }

        return !errors;
      },

      /**
       * Triggering validation results (invalid/valid) with errors list if nay
       * @param {Object} attributes - validated attributes
       * @param {Object|null} errors
       */
      triggerValidated: function(attributes, errors) {
        var attrs = getAttrsToValidate(this, attributes),
            errs = getCleanErrors(errors);

        this.validationError = errs;
        this.trigger('validated', this, attrs, errs);
        this.trigger('validated:' + (errs ? 'invalid' : 'valid'), this, attrs, errs);
      },

      /**
       * Checks if model is valid
       *
       * @param {Object} [attributes] - optional list of attributes to validate
       * @param {Object} [options] - standard Backbone.Model's options list
       * @return {boolean}
       */
      isValid: function(attributes, options) {
        var attrs = getAttrsToValidate(this, attributes);
        return !this.validate || !this.validate(attrs, options);
      }
    }
  };

  /**
   * Alternative to _.pick() - but also picks undefined/null/false values
   *
   * @param {Object} object - source hash
   * @param {Array} keys - needed keys to pick
   * @return {Object}
   */
  var pick = function(object, keys) {
    return _.inject(_.flatten([keys]), function(memo, key) {
      memo[key] = object[key];
      return memo;
    }, {});
  };

  /**
   * Fetching attributes to validate
   * @return {*}
   */
  var getAttrsToValidate = function(model, passedAttrs) {
    var modelAttrs = model.attributes,
        validationAttrs = _.result(model, 'validation'),
        attrs, all;

    if (_.isArray(passedAttrs) || _.isString(passedAttrs)) {
      attrs = pick(modelAttrs, passedAttrs);
    } else if (!passedAttrs) {
      all = _.extend({}, modelAttrs, validationAttrs || {});
      attrs = pick(modelAttrs, _.keys(all));
    } else {
      attrs = passedAttrs;
    }

    return attrs;
  };

  /**
   * Cleanup errors object from empty error values
   * @param errors
   */
  var getCleanErrors = function(errors) {
    var errs = _.inject(errors, function(memo, error, attr) {
      if (error.length) {
        memo[attr] = error;
      }

      return memo;
    }, {});

    return _.size(errs) ? errs : null;
  };

  var createErrorMessage = function() {
    return Validator.createMessage ? Validator.createMessage.apply(null, arguments) : false;
  };

  /**
   * Built-in validators
   * @type {Array}
   */
  var validators = [
    {
      name: 'required',
      message: 'Is required',
      fn: function(value, expectation) {
        return expectation === false || !!value;
      }
    },
    {
      name: 'collection',
      fn: function(collection, expectation) {
        if (expectation === false) {
          return true;
        }

        var errors = _.inject(collection.models || collection, function(memo, model, index) {
          var error = model.validate();

          if (error) {
            memo.push([index, error]);
          }

          return memo;
        }, []);

        return errors.length ? errors : true;
      }
    },
    {
      name: 'minLength',
      message: 'Is too short',
      fn: function(value, expectation) {
        return !value || value.length >= expectation;
      }
    },
    {
      name: 'maxLength',
      message: 'Is too long',
      fn: function(value, expectation) {
        return !value || value.length <= expectation;
      }
    },
    {
      name: 'format',
      message: 'Does not match format',
      fn: function(value, expectation) {
        return !value || !!value.match(Validator.formats[expectation] || expectation);
      }
    },
    {
      name: 'fn',
      fn: function(value, expectation) {
        return expectation.call(this, value);
      }
    }
  ];

  /**
   * Built-in formats
   */
  Validator.formats = {
    digits: /^\d+$/,
    number: /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/,
    email: /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
    url: /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
  };

  _.each(validators, function(validator) {
    Validator.add(validator.name, validator.fn, validator.message);
  });


  /**
   * Applying validator functionality to backbone's core
   */
  _.extend(Backbone.Model.prototype, Validator.Extensions.Model);
  _.extend(Backbone.View.prototype, Validator.Extensions.View);

  return Validator;
})(_);


(function(_){

var Form = Backbone.Form = Backbone.View.extend({

  /**
   * Constructor
   * 
   * @param {Object} [options.schema]
   * @param {Backbone.Model} [options.model]
   * @param {Object} [options.data]
   * @param {String[]|Object[]} [options.fieldsets]
   * @param {String[]} [options.fields]
   * @param {String} [options.idPrefix]
   * @param {Form.Field} [options.Field]
   * @param {Form.Fieldset} [options.Fieldset]
   * @param {Function} [options.template]
   */
  initialize: function(options) {
    var self = this;

    options = options || {};

    //Find the schema to use
    var schema = this.schema = (function() {
      //Prefer schema from options
      if (options.schema) return _.result(options, 'schema');

      //Then schema on model
      var model = options.model;
      if (model && model.schema) {
        return _.result(model, 'schema');
      }

      //Then built-in schema
      if (self.schema) {
        return _.result(self, 'schema');
      }

      //Fallback to empty schema
      return {};
    })();

    //Store important data
    _.extend(this, _.pick(options, 'data', 'idPrefix'));

    //Override defaults
    var constructor = this.constructor;
    this.template = options.template || constructor.template;
    this.Fieldset = options.Fieldset || constructor.Fieldset;
    this.Field = options.Field || constructor.Field;
    this.NestedField = options.NestedField || constructor.NestedField;

    //Check which fields will be included (defaults to all)
    var selectedFields = this.selectedFields = options.fields || _.keys(schema);

    //Create fields
    var fields = this.fields = {};

    _.each(selectedFields, function(key) {
      var fieldSchema = schema[key];
      fields[key] = this.createField(key, fieldSchema);
    }, this);

    //Create fieldsets
    var fieldsetSchema = options.fieldsets || [selectedFields],
        fieldsets = this.fieldsets = [];

    _.each(fieldsetSchema, function(itemSchema) {
      this.fieldsets.push(this.createFieldset(itemSchema));
    }, this);
    this.bindValidation();
  },

  onValidField: function(name /*, value, model*/) {
	  if(this.fields[name]){
		  this.fields[name].clearError();
	  }
  },

    onInvalidField: function(name, value, errors /*, model*/) {
      if(this.fields[name]){
    	  this.fields[name].setError(errors.join(', '));
      }
   },
  /**
   * Creates a Fieldset instance
   *
   * @param {String[]|Object[]} schema       Fieldset schema
   *
   * @return {Form.Fieldset}
   */
  createFieldset: function(schema) {
    var options = {
      schema: schema,
      fields: this.fields
    };

    return new this.Fieldset(options);
  },

  /**
   * Creates a Field instance
   *
   * @param {String} key
   * @param {Object} schema       Field schema
   *
   * @return {Form.Field}
   */
  createField: function(key, schema) {
    var options = {
      form: this,
      key: key,
      schema: schema,
      idPrefix: this.idPrefix
    };

    if (this.model) {
      options.model = this.model;
    } else if (this.data) {
      options.value = this.data[key];
    } else {
      options.value = null;
    }

    var field = new this.Field(options);

    this.listenTo(field.editor, 'all', this.handleEditorEvent);

    return field;
  },

  /**
   * Callback for when an editor event is fired.
   * Re-triggers events on the form as key:event and triggers additional form-level events
   *
   * @param {String} event
   * @param {Editor} editor
   */
  handleEditorEvent: function(event, editor) {
    //Re-trigger editor events on the form
    var formEvent = editor.key+':'+event;

    this.trigger.call(this, formEvent, this, editor);

    //Trigger additional events
    switch (event) {
      case 'change':
    	this.commit({validate:true});
        this.trigger('change', this);
        break;
    }
      
  },

  render: function() {
    var self = this,
        fields = this.fields;

    //Render form
    var $form = $($.trim(this.template(_.result(this, 'templateData'))));

    //Render standalone editors
    $form.find('[data-editors]').add($form).each(function(i, el) {
      var $container = $(el),
          selection = $container.attr('data-editors');

      if (_.isUndefined(selection)) return;

      //Work out which fields to include
      var keys = (selection == '*')
        ? self.selectedFields || _.keys(fields)
        : selection.split(',');

      //Add them
      _.each(keys, function(key) {
        var field = fields[key];

        $container.append(field.editor.render().el);
      });
    });

    //Render standalone fields
    $form.find('[data-fields]').add($form).each(function(i, el) {
      var $container = $(el),
          selection = $container.attr('data-fields');

      if (_.isUndefined(selection)) return;

      //Work out which fields to include
      var keys = (selection == '*')
        ? self.selectedFields || _.keys(fields)
        : selection.split(',');

      //Add them
      _.each(keys, function(key) {
        var field = fields[key];

        $container.append(field.render().el);
      });
    });

    //Render fieldsets
    $form.find('[data-fieldsets]').add($form).each(function(i, el) {
      var $container = $(el),
          selection = $container.attr('data-fieldsets');

      if (_.isUndefined(selection)) return;

      _.each(self.fieldsets, function(fieldset) {
        $container.append(fieldset.render().el);
      });
    });

    //Set the main element
    this.setElement($form);

    return this;
  },

  /**
   * Validate the data
   *
   * @return {Object}       Validation errors
   */
  validate: function() {
    return this.model.validate();
  },

  /**
   * Update the model with all latest values.
   *
   * @param {Object} [options]  Options to pass to Model#set (e.g. { silent: true })
   *
   * @return {Object}  Validation errors
   */
  commit: function(options) {
   
    this.model.set(this.getValue(), options);
    return this.model.validationError;
  },

  /**
   * Get all the field values as an object.
   * Use this method when passing data instead of objects
   *
   * @param {String} [key]    Specific field value to get
   */
  getValue: function(key) {
    //Return only given key if specified
    if (key) return this.fields[key].val();

    //Otherwise return entire form
    var values = {};
    _.each(this.fields, function(field) {
      values[field.key] = field.val();
    });

    return values;
  },

  /**
   * Update field values, referenced by key
   *
   * @param {Object|String} key     New values to set, or property to set
   * @param val                     Value to set
   */
  setValue: function(prop, val) {
    var data = {};
    if (_.isString(prop)) {
      data[prop] = val;
    } else {
      data = prop;
    }

    var key;
    for (key in this.schema) {
      if (!_.isUndefined(data[key])) {
        this.fields[key].val(data[key]);
      }
    }
  },



 
  /**
   * Manages the hasFocus property
   *
   * @param {String} event
   */
  trigger: function(event) {
      return Backbone.View.prototype.trigger.apply(this, arguments);
  },

  /**
   * Override default remove function in order to remove embedded views
   *
   * TODO: If editors are included directly with data-editors="x", they need to be removed
   * May be best to use XView to manage adding/removing views
   */
  remove: function() {
    _.each(this.fieldsets, function(fieldset) {
      fieldset.remove();
    });

    _.each(this.fields, function(field) {
      field.remove();
    });

    Backbone.View.prototype.remove.call(this);
  }

}, {

  //STATICS
  template: _.template('\
    <form data-fieldsets></form>\
  ', null, this.templateSettings),

  templateSettings: {
    evaluate: /<%([\s\S]+?)%>/g, 
    interpolate: /<%=([\s\S]+?)%>/g, 
    escape: /<%-([\s\S]+?)%>/g
  },

  editors: {}

});
Form.Fieldset = Backbone.View.extend({

	  /**
	   * Constructor
	   *
	   * Valid fieldset schemas:
	   *   ['field1', 'field2']
	   *   { legend: 'Some Fieldset', fields: ['field1', 'field2'] }
	   *
	   * @param {String[]|Object[]} options.schema      Fieldset schema
	   * @param {Object} options.fields           Form fields
	   */
	  initialize: function(options) {
	    options = options || {};

	    //Create the full fieldset schema, merging defaults etc.
	    var schema = this.schema = this.createSchema(options.schema);

	    //Store the fields for this fieldset
	    this.fields = _.pick(options.fields, schema.fields);
	    
	    //Override defaults
	    this.template = options.template || this.constructor.template;
	  },

	  /**
	   * Creates the full fieldset schema, normalising, merging defaults etc.
	   *
	   * @param {String[]|Object[]} schema
	   *
	   * @return {Object}
	   */
	  createSchema: function(schema) {
	    //Normalise to object
	    if (_.isArray(schema)) {
	      schema = { fields: schema };
	    }

	    //Add null legend to prevent template error
	    schema.legend = schema.legend || null;

	    return schema;
	  },

	  /**
	   * Returns the field for a given index
	   *
	   * @param {Number} index
	   *
	   * @return {Field}
	   */
	  getFieldAt: function(index) {
	    var key = this.schema.fields[index];

	    return this.fields[key];
	  },

	  /**
	   * Returns data to pass to template
	   *
	   * @return {Object}
	   */
	  templateData: function() {
	    return this.schema;
	  },

	  /**
	   * Renders the fieldset and fields
	   *
	   * @return {Fieldset} this
	   */
	  render: function() {
	    var schema = this.schema,
	        fields = this.fields;

	    //Render fieldset
	    var $fieldset = $($.trim(this.template(_.result(this, 'templateData'))));

	    //Render fields
	    $fieldset.find('[data-fields]').add($fieldset).each(function(i, el) {
	      var $container = $(el),
	          selection = $container.attr('data-fields');

	      if (_.isUndefined(selection)) return;

	      _.each(fields, function(field) {
	        $container.append(field.render().el);
	      });
	    });

	    this.setElement($fieldset);

	    return this;
	  },

	  /**
	   * Remove embedded views then self
	   */
	  remove: function() {
	    _.each(this.fields, function(field) {
	      field.remove();
	    });

	    Backbone.View.prototype.remove.call(this);
	  }
	  
	}, {
	  //STATICS

	  template: _.template('\
	    <fieldset data-fields>\
	      <% if (legend) { %>\
	        <legend><%= legend %></legend>\
	      <% } %>\
	    </fieldset>\
	  ', null, Form.templateSettings)

	});


	//==================================================================================================
	//FIELD
	//==================================================================================================

	Form.Field = Backbone.View.extend({

	  /**
	   * Constructor
	   * 
	   * @param {Object} options.key
	   * @param {Object} options.form
	   * @param {Object} [options.schema]
	   * @param {Function} [options.schema.template]
	   * @param {Backbone.Model} [options.model]
	   * @param {Object} [options.value]
	   * @param {String} [options.idPrefix]
	   * @param {Function} [options.template]
	   * @param {Function} [options.errorClassName]
	   */
	  initialize: function(options) {
	    options = options || {};

	    //Store important data
	    _.extend(this, _.pick(options, 'form', 'key', 'value', 'idPrefix'));

	    //Create the full field schema, merging defaults etc.
	    var schema = this.schema = this.createSchema(options.schema);

	    //Override defaults
	    this.template = options.template || schema.template || this.constructor.template;
	    this.errorClassName = options.errorClassName || this.constructor.errorClassName;

	    //Create editor
	    this.editor = this.createEditor();
	  },

	  /**
	   * Creates the full field schema, merging defaults etc.
	   *
	   * @param {Object|String} schema
	   *
	   * @return {Object}
	   */
	  createSchema: function(schema) {
	    if (_.isString(schema)) schema = { type: schema };

	    //Set defaults
	    schema = _.extend({
	      type: 'Text',
	      title: this.createTitle()
	    }, schema);

	    //Get the real constructor function i.e. if type is a string such as 'Text'
	    schema.type = (_.isString(schema.type)) ? Backbone.Form.editors[schema.type] : schema.type;

	    return schema;
	  },

	  /**
	   * Creates the editor specified in the schema; either an editor string name or
	   * a constructor function
	   *
	   * @return {View}
	   */
	  createEditor: function() {
	    var options = _.extend(
	      _.pick(this, 'schema', 'form', 'key', 'model', 'value'),
	      { id: this.createEditorId() }
	    );

	    var constructorFn = this.schema.type;

	    return new constructorFn(options);
	  },

	  /**
	   * Creates the ID that will be assigned to the editor
	   *
	   * @return {String}
	   */
	  createEditorId: function() {
	    var prefix = this.idPrefix,
	        id = this.key;

	    //Replace periods with underscores (e.g. for when using paths)
	    id = id.replace(/\./g, '_');

	    //If a specific ID prefix is set, use it
	    if (_.isString(prefix) || _.isNumber(prefix)) return prefix + id;
	    if (_.isNull(prefix)) return id;

	    //Otherwise, if there is a model use it's CID to avoid conflicts when multiple forms are on the page
	    if (this.model) return this.model.cid + '_' + id;

	    return id;
	  },

	  /**
	   * Create the default field title (label text) from the key name.
	   * (Converts 'camelCase' to 'Camel Case')
	   *
	   * @return {String}
	   */
	  createTitle: function() {
	    var str = this.key;

	    //Add spaces
	    str = str.replace(/([A-Z])/g, ' $1');

	    //Uppercase first character
	    str = str.replace(/^./, function(str) { return str.toUpperCase(); });

	    return str;
	  },

	  /**
	   * Returns the data to be passed to the template
	   *
	   * @return {Object}
	   */
	  templateData: function() {
	    var schema = this.schema;

	    return {
	      help: schema.help || '',
	      title: schema.title,
	      fieldAttrs: schema.fieldAttrs,
	      editorAttrs: schema.editorAttrs,
	      key: this.key,
	      editorId: this.editor.id
	    };
	  },

	  /**
	   * Render the field and editor
	   *
	   * @return {Field} self
	   */
	  render: function() {
	    var schema = this.schema,
	        editor = this.editor;

	    //Render field
	    var $field = $($.trim(this.template(_.result(this, 'templateData'))));

	    if (schema.fieldClass) $field.addClass(schema.fieldClass);
	    if (schema.fieldAttrs) $field.attr(schema.fieldAttrs);

	    //Render editor
	    $field.find('[data-editor]').add($field).each(function(i, el) {
	      var $container = $(el),
	          selection = $container.attr('data-editor');

	      if (_.isUndefined(selection)) return;

	      $container.append(editor.render().el);
	    });

	    this.setElement($field);

	    return this;
	  },

	  /**
	   * Check the validity of the field
	   *
	   * @return {String}
	   */
	  validate: function() {
	    return this.editor.validate();
	  },

	  /**
	   * Set the field into an error state, adding the error class and setting the error message
	   *
	   * @param {String} msg     Error message
	   */
	  setError: function(msg) {
	    //Nested form editors (e.g. Object) set their errors internally
	    if (this.editor.hasNestedForm) return;

	    //Add error CSS class
	    this.$el.addClass(this.errorClassName);

	    //Set error message
	    this.$('[data-error]').html(msg);
	  },

	  /**
	   * Clear the error state and reset the help message
	   */
	  clearError: function() {
	    //Remove error CSS class
	    this.$el.removeClass(this.errorClassName);

	    //Clear error message
	    this.$('[data-error]').empty();
	  },

	  /**
	   * Update the model with the new value from the editor
	   *
	   * @return {Mixed}
	   */
	  commit: function() {
	    return this.editor.commit();
	  },

	  val: function(val){
		  if(!val) return this.editor.val();
		  this.editor.val(val);
	  },
	  
	  remove: function() {
	    this.editor.remove();

	    Backbone.View.prototype.remove.call(this);
	  }

	}, {
	  //STATICS

	  template: _.template('\
	    <div>\
	      <label for="<%= editorId %>"><%= title %></label>\
	      <div>\
	        <span data-editor></span>\
	        <div data-error></div>\
	        <div><%= help %></div>\
	      </div>\
	    </div>\
	  ', null, Form.templateSettings),

	  /**
	   * CSS class name added to the field when there is a validation error
	   */
	  errorClassName: 'error'

	});


	//==================================================================================================
	//NESTEDFIELD
	//==================================================================================================

	Form.NestedField = Form.Field.extend({

	  template: _.template($.trim('\
	    <div>\
	      <span data-editor></span>\
	      <% if (help) { %>\
	        <div><%= help %></div>\
	      <% } %>\
	      <div data-error></div>\
	    </div>\
	  '), null, Form.templateSettings)

	});




_.mixin({
	typeSupport:function(type){
		var elem = document.createElement('input');
		elem.setAttribute('type',type);
		return elem.getAttribute('type')===type;
	}
});
function extend(obj,queue,methodName){
	var childObj = {};
	while(obj && obj[methodName])
	{
		if(obj[methodName] != childObj[methodName]){
			if($.isArray(queue)){
			queue.push(obj[methodName]);
			}else{
			$.extend(true,queue,_.isFunction(obj[methodName])?obj[methodName]():obj[methodName]);
			}
			childObj = obj;	
		}
		obj = obj.constructor.__super__;
	}
	return queue;
}

var BaseView = Backbone.View.extend({
   
    executeQueue: function(queue,options,bottom){
    	var i = bottom?0:queue.length-1;
    	while((bottom && i<queue.length) ||(!bottom && i>=0)){
    		queue[i].apply(this,[options]);
    		i=bottom?i+1:i-1;
    	}
    },
    initQueue: function(queue,methodName){
		return extend(this,queue,methodName);
    },
    
    initialize: function(options){
    	this.initializeChain = this.initializeChain || this.initQueue.apply(this,[[],"_initialize"]);
    	this.executeQueue.apply(this,[this.initializeChain,options]);
    },
    
    events: function() {
        return this.initQueue.apply(this,[{},"_events"]);
    },
    
    render: function(){
    	this.renderChain = this.renderChain || this.initQueue.apply(this,[[],"_render"]);
    	this.executeQueue.apply(this,[this.renderChain]);
    	return this;
    },
    
	unrender: function(){
	      $this.$el.remove();
	}
})  

Form.Editor = Form.editors.Base = BaseView.extend({

  defaultValue: '',
  sel: '',
  tagName: 'input',

  _initialize: function(options) {
    var options = options || {};
    (this._events = {})['change '+ this.sel] = function(e){
		  this.trigger('change', this);
	  }

    // Set initial value
    if (options.model) {
      if (!options.key) throw "Missing option: 'key'";

      this.model = options.model;

      this.value = this.model.get(options.key);
    }
    else if (options.value) {
      this.value = options.value;
    }

    if (this.value === undefined) this.value = this.defaultValue;

    //Store important data
    _.extend(this, _.pick(options, 'key', 'form'));

    var schema = this.schema = options.schema || {};

    this.validators = options.validators || schema.validators;

    //Main attributes
    this.$el.attr('id', this.id);
    this.$el.attr('name', this.name());
    if (schema.editorClass) this.$el.addClass(schema.editorClass);
    if (schema.editorAttrs) this.$el.attr(schema.editorAttrs);
  },

  /**
   * Get the value for the form input 'name' attribute
   *
   * @return {String}
   *
   * @api private
   */
  name: function() {
    var key = this.key || '';

    //Replace periods with underscores (e.g. for when using paths)
    return key.replace(/\./g, '_');
  },
  
  val: function(val){
	  if(!val) return this.$el.val();
	  this.$el.val(val);
  },

  trigger: function(event) {
	    return Backbone.View.prototype.trigger.apply(this, arguments);
  },
 
  commit: function(options) {
    this.model.set(this.key, this.val(), options);
    return this.model.validationError;
  },
  validate: function(){
	  (attrs = {})[this.key] = this.val();
	  return this.model.validate(attrs);
  }
  

 
});

/**
 * Text
 * 
 * Text input with focus, blur and change events
 */
Form.editors.Text = Form.Editor.extend({


  _initialize: function(options) {

    var schema = this.schema;

    //Allow customising text type (email, phone etc.) for HTML5 browsers
    var type = 'text';

    if (schema && schema.editorAttrs && schema.editorAttrs.type) type = schema.editorAttrs.type;
    if (schema && schema.dataType) type = schema.dataType;

    this.$el.attr('type', type);
  },

  /**
   * Adds the editor to the DOM
   */
  render: function() {
    this.val(this.value);
    return this;
  }

 
  



});

/**
 * TextArea editor
 */
Form.editors.TextArea = Form.editors.Text.extend({

  tagName: 'textarea'

});

/**
 * Password editor
 */
Form.editors.Password = Form.editors.Text.extend({

  _initialize: function(options) {

    this.$el.attr('type', 'password');
  }

});

/**
 * NUMBER
 * 
 * Normal text input that only allows a number. Letters etc. are not entered.
 */
Form.editors.Number = Form.editors.Text.extend({

  defaultValue: 0,
  _events: {
	  'keypress': function(e){
			var newVal = this.$el.val() + String.fromCharCode(e.charCode);
			if(!(/^[0-9]*\.?[0-9]*?$/.test(newVal))){
				e.preventDefault();
			}
		}
  },
  _initialize: function(options) {
    if(_.typeSupport('number')){
    	this.$el.attr('type', 'number');
        this.$el.attr('step', 'any');
    }
    
  }

});

/**
 * Hidden editor
 */
Form.editors.Hidden = Form.editors.Base.extend({

  _initialize: function(options) {
    this.$el.attr('type', 'hidden');
  }
});

/**
 * Checkbox editor
 *
 * Creates a single checkbox, i.e. boolean value
 */
Form.editors.Checkbox = Form.editors.Base.extend({

  defaultValue: false,

 

  _initialize: function(options) {
    this.$el.attr('type', 'checkbox');
  },

  render: function() {
    this.val(this.value);
    return this;
  },
  
  val: function(val){
	  if(!val) return this.$el.prop('checked');
	  this.$el.prop('checked', new Boolean(val));
  }

});

/**
 * Select editor
 *
 * Renders a <select> with given options
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Select = Form.editors.Base.extend({

  tagName: 'select',

  _initialize: function(options) {
    if (!this.schema || !this.schema.options) throw "Missing required 'schema.options'";
  },

  render: function() {
    this.setOptions(this.schema.options);
    return this;
  },

  /**
   * Sets the options that populate the <select>
   *
   * @param {Mixed} options
   */
  setOptions: function(options) {
    var self = this;

    //If a collection was passed, check if it needs fetching
    if (options instanceof Backbone.Collection) {
      //Don't do the fetch if it's already populated
      if (options.length > 0) {
        this._collectionToHtml(options);
      } else {
        options.fetch({
          success: function() {
            self._collectionToHtml(options);
          }
        });
      }
    }
    //Otherwise, ready to go straight to renderOptions
    else {
      this.renderOptions(options);
    }
  },

  /**
   * Adds the <option> html to the DOM
   * @param {Mixed}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   *                      or as a string of <option> HTML to insert into the <select>
   */
  renderOptions: function(options) {
    var $select = this.$el,
        html;

    html = this._getOptionsHtml(options);

    //Insert options
    $select.html(html);

    //Select correct option
    this.val(this.value);
  },

  _getOptionsHtml: function(options) {
    var html;
    //Accept string of HTML
    if (_.isString(options)) {
      html = options;
    }

    //Or array
    else if (_.isArray(options)) {
      html = this._arrayToHtml(options);
    }
    else if (_.isFunction(options)) {
      var newOptions;
      
      options(function(opts) {
        newOptions = opts;
      }, this);
      
      html = this._getOptionsHtml(newOptions);
    }

    return html;
  },

  

  /**
   * Transforms a collection into HTML ready to use in the renderOptions method
   * @param {Backbone.Collection}
   * @return {String}
   */
  _collectionToHtml: function(collection) {
    //Convert collection to array first
    var array = [];
    collection.each(function(model) {
      array.push({ val: model.id, label: model.toString() });
    });

    //Now convert to HTML
    var html = this.renderOptions(array);

    return html;
  },

  /**
   * Create the <option> HTML
   * @param {Array}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   * @return {String} HTML
   */
  _arrayToHtml: function(array) {
    var html = [];

    //Generate HTML
    _.each(array, function(option) {
      if (_.isObject(option)) {
        if (option.group) {
          html.push('<optgroup label="'+option.group+'">');
          html.push(this._getOptionsHtml(option.options))
          html.push('</optgroup>');
        } else {
          var val = (option.val || option.val === 0) ? option.val : '';
          html.push('<option value="'+val+'">'+option.label+'</option>');
        }
      }
      else {
        html.push('<option>'+option+'</option>');
      }
    }, this);

    return html.join('');
  }

});

/**
 * Radio editor
 *
 * Renders a <ul> with given options represented as <li> objects containing radio buttons
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Radio = Form.editors.Select.extend({

  tagName: 'ul',
  sel: 'input[type=radio]',

  type:'radio',
  val: function(val){
		if(!val)return this.$(this.sel+':checked').map(function() {
		      return $(this).val();
	    }).get();
	    this.$(sel).val(_.flatten(values));
  },
  
  /**
   * Create the radio list HTML
   * @param {Array}   Options as a simple array e.g. ['option1', 'option2']
   *                      or as an array of objects e.g. [{val: 543, label: 'Title for object 543'}]
   * @return {String} HTML
   */
  _arrayToHtml: function (array) {
    var html = [];
    var self = this;
    _.map(array, function(elem){if(_.isString(elem)){
    		elem = {'type':self.type,'val':elem,'label':elem}
    	}
    	return elem;});
    _.each(array, function(option, index) {
      var itemHtml = '<li>';
      var val = (option.val || option.val === 0) ? option.val : '';
      itemHtml += ('<input type="'+option.type+'" name="'+self.id+'" value="'+val+'" id="'+self.id+'-'+index+'" />');
      itemHtml += ('<label for="'+self.id+'-'+index+'">'+option.label+'</label>');
      
      itemHtml += '</li>';
      html.push(itemHtml);
    });

    return html.join('');
  }

});

/**
 * Checkboxes editor
 *
 * Renders a <ul> with given options represented as <li> objects containing checkboxes
 *
 * Requires an 'options' value on the schema.
 *  Can be an array of options, a function that calls back with the array of options, a string of HTML
 *  or a Backbone collection. If a collection, the models must implement a toString() method
 */
Form.editors.Checkboxes = Form.editors.Radio.extend({

	type:'checkbox',

	sel: 'input[type=checkbox]'
	
});

})(_);
