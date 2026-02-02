import <%= fnObjectName %>Component from "./<%= fnObjectName %>Component.js";


// <%= fnObjectName %> Web
// A web side import for an ABView.
//
export default function <%= fnObjectName %>({
   /*AB,*/
   ABViewPlugin,
   ABViewComponentPlugin,
   ABViewContainer
}) {
   const AB<%= objectNamePascal %>Component = <%= fnObjectName %>Component({ ABViewComponentPlugin });


   // Define the default values for this components settings:
   // when a new instance of your widget is created, these values will be 
   // the default settings
   const AB<%= objectNamePascal %>ComponentDefaults = {
      // text: "",
      // {string}
      // A multilingual text template that is used to display a given set of
      // values.

      // height: 0,
      // {integer}
      // The default height of this widget.

      // dataviewID: null,
      // {uuid}
      // The {ABDataCollection.id} of the datacollection this ABViewText is
      // pulling data from.
      // In most usage situations this ABView is tied to the data in an
      // ABDataCollection.  However, it is possible for an ABObject to be
      // directly assigned to the ABView, and that will be used instead.
   };

   // Define the Default Values for this ABView
   // These are used by the platform and ABDesigner to display the view.
   const ABViewDefaults = {
      key: "<%= pluginKey %>",
      // {string}
      // unique key for this view

      icon: "font",
      // {string}
      // fa-[icon] reference for this view

      labelKey: "Plugin <%= pluginKey %>",
      // {string}
      // the multilingual label key for the class label
   };

   ///
   /// We return the ABView here
   ///
   return class AB<%= objectNamePascal %> extends ABViewPlugin {
      // constructor(...params) {
      //    super(...params);
      // }

      /**
       * @method getPluginKey
       * return the plugin key for this view.
       * @return {string} plugin key
       */
      static getPluginKey() {
         return "<%= pluginKey %>";
      }

      /**
       * @method common
       * return the common values for this view.
       * @return {obj} common values
       */
      static common() {
         return ABViewDefaults;
      }

      /**
       * @method defaultValues
       * return the default values for this view.
       * @return {obj} default values
       */
      static defaultValues() {
         return AB<%= objectNamePascal %>ComponentDefaults;
      }
      
      /**
       * @method component()
       * return a UI component based upon this view.
       * @return {obj} UI component
       */
      component(parentId) {
         return new AB<%= objectNamePascal %>Component(this, parentId);
      }

      /**
       * @method toObj()
       * properly compile the current state of this ABView instance
       * into the values needed for saving to the DB.
       * @return {json}
       */
      toObj() {
         // NOTE: ABView auto translates/untranslates "label"
         // add in any additional fields here:
         // this.unTranslate(this, this, ["text"]);

         var obj = super.toObj();
         obj.views = [];
         return obj;
      }

      /**
       * @method fromValues()
       *
       * initialze this object with the given set of values.
       * @param {obj} values
       */
      fromValues(values) {
         super.fromValues(values);

         this.settings = this.settings || {};

         //
         // populate any additional fields here:
         //

         // NOTE: ABView auto translates/untranslates "label"
         // add in any additional fields here:
         // this.translate(this, this, ["text"]);
      }
      
      /**
       * @method componentList
       * return the list of components available on this view to display in the editor.
       */
      componentList() {
         // NOTE: if your component allows other components to be placed inside, then
         // return the list of components that are allowed to be placed inside.
         // otherwise return an empty array.
         return [];
      }
   };
}

