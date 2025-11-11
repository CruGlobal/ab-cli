// <%= fnObjectName %> Web
// A web side import for an ABObject.
//
export default function <%= fnObjectName %>({
   /*AB,*/
   ABObjectPlugin,
   ABModelPlugin,
}) {
   //
   // Our ABModel for interacting with the website
   //
   class ABModel<%= objectNamePascal %> extends ABModelPlugin {
      /**
       * @method normalizeData()
       * For a Netsuite object, there are additional steps we need to handle
       * to normalize our data.
       */
      normalizeData(data) {
         super.normalizeData(data);
      }
   }

   ///
   /// We return the ABObject here
   ///
   return class AB<%= objectNamePascal %> extends ABObjectPlugin {
      // constructor(...params) {
      //    super(...params);
      // }

      static getPluginKey() {
         return "<%= pluginKey %>";
      }

      static getPluginType() {
         return "object";
      }

      /**
       * @method toObj()
       *
       * properly compile the current state of this ABObjectQuery instance
       * into the values needed for saving to the DB.
       *
       * @return {json}
       */
      toObj() {
         const result = super.toObj();
         result.plugin_key = this.constructor.getPluginKey();

         return result;
      }

      /**
       * @method model
       * return a Model object that will allow you to interact with the data for
       * this ABObjectQuery.
       */
      model() {
         var model = new ABModel<%= objectNamePascal %>(this);

         // default the context of this model's operations to this object
         model.contextKey(this.constructor.contextKey());
         model.contextValues({ id: this.id }); // the datacollection.id

         return model;
      }
   };
} // end of FNObjectNetsuiteAPI
