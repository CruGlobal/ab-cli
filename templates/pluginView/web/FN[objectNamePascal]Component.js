export default function <%= fnObjectName %>Component({
   /*AB,*/
   ABViewComponentPlugin,
}) {
   return class AB<%= objectNamePascal %>Component extends ABViewComponentPlugin {
      constructor(baseView, idBase, ids) {
         super(
            baseView,
            idBase || `AB<%= objectNamePascal %>_${baseView.id}`,
            Object.assign(
               {
                  template: "",
               },
               ids,
            ),
         );
      }

      /**
       * @method ui
       * return the Webix UI definition for this component.
       * @return {object} Webix UI definition
       */
      ui() {
         return super.ui([
            {
               id: this.ids.template,
               view: "template",
               template: "<%= objectNamePascal %> Template",
               minHeight: 10,
               // css: "ab-custom-template",
               // borderless: true,
            }
         ]);
      }

      /** 
       * @method onShow
       * called when the component is shown.
       * perform any additional initialization here.
       */
      onShow() {
         super.onShow();
      }
   };
}
