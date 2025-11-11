// <%= fnObjectName %> Service
// A service side import for an ABObject.
//
import <%= fnObjectName %>Model from "./FN<%= objectNamePascal %>Model.js";

export default function <%= fnObjectName %>({
   /*AB,*/
   ABObjectPlugin,
   ABModelPlugin,
}) {

   const ABModel<%= objectNamePascal %> = <%= fnObjectName %>Model({ ABModelPlugin });

   return class AB<%= objectNamePascal %> extends ABObjectPlugin {
      constructor(...params) {
         super(...params);
      }

      static getPluginKey() {
         return "<%= pluginKey %>";
      }

      static getPluginType() {
         return "object";
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
}