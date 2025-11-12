// <%= fnObjectName %> Properties
// A properties side import for an ABView.
//
export default function <%= fnObjectName %>Properties({
   AB,
   ABViewPropertiesPlugin,
   // ABUIPlugin,
}) {
   return class AB<%= objectNamePascal %>Properties extends ABViewPropertiesPlugin {
      constructor() {
         super(AB<%= objectNamePascal %>Properties.getPluginKey(), {
            //
            // add your property ids here:
            //
         });

         this.AB = AB;

         // let myBase = ABFakeobj.getPluginKey();
         // this.UI_Credentials = FNCredentials(this.AB, myBase, ABUIPlugin);
      }


      static getPluginKey() {
         return "<%= pluginKey %>";
      }

      static getPluginType() {
         return "properties-view";
         // properties-view : will display in the properties panel of the ABDesigner
      }

      ui() {
         const ids = this.ids;
         let L = this.AB.Label();
         const uiConfig = this.AB.Config.uiSettings();
         return super.ui([
            //
            // insert your webix property list here
            //
         ]);
      }

      async init(AB) {
         await super.init(AB);

         //
         // perform any additional initialization here
         //

      }

      /**
       * @method populate
       * populate the properties with the values from the view.
       * @param {obj} view
       */
      populate(view) {
         super.populate(view);

         const ids = this.ids;

         // populate your property values here
         // $$(ids.height).setValue(view.settings.height);
      }

      /**
       * @method values
       * return the values from the property editor
       * @return {obj}
       */
      values() {
         const values = super.values();

         const ids = this.ids;
         const $component = $$(ids.component);

         values.settings = $component.getValues();

         // make sure any additional values/settings are properly set
         // if (values.settings.dataviewID == "none")
         //    values.settings.dataviewID = null;

         return values;
      }
   };
}

