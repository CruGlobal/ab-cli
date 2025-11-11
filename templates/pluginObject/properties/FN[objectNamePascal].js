// <%= fnObjectName %> Properties
// A properties side import for an ABObject.
//

export default function <%= fnObjectName %>({
   ABPropertiesObjectPlugin,
   // ABUIPlugin,
}) {
   return class AB<%= objectNamePascal %> extends ABPropertiesObjectPlugin {
      constructor(...params) {
         super(...params);

         // let myBase = AB<%= objectNamePascal %>.getPluginKey();
         // this.UI_Credentials = FNCredentials(this.AB, myBase, ABUIPlugin);
      }

      static getPluginKey() {
         return "<%= pluginKey %>";
      }

      static getPluginType() {
         return "properties-object";
      }

      header() {
         // this is the name used when choosing the Object Type
         // tab selector.
         let L = this.L();
         return L("<%= objectName %>");
      }

      rules() {
         return {
            // name: webix.rules.isNotEmpty,
         };
      }

      elements() {
         let L = this.L();
         // return the webix form element definitions to appear on the page.
         return [
            // {
            //    rows: [
            //       {
            //          view: "text",
            //          label: L("Name"),
            //          name: "name",
            //          required: true,
            //          placeholder: L("Object name"),
            //          labelWidth: 70,
            //       },
            //       {
            //          view: "checkbox",
            //          label: L("Read Only"),
            //          name: "readonly",
            //          value: 0,
            //          // disabled: true,
            //       },
            //    ],
            // },
         ];
      }

      async init(AB) {
         this.AB = AB;

         this.$form = $$(this.ids.form);
         AB.Webix.extend(this.$form, webix.ProgressBar);

         // await this.UI_Credentials.init(AB);

         // this.UI_Credentials.show();

         // // "verified" is triggered on the credentials tab once we verify
         // // the entered data is successful.
         // this.UI_Credentials.on("verified", () => {
         //
         // });
      }

      formClear() {
         this.$form.clearValidation();
         this.$form.clear();

         // this.UI_Credentials.formClear();

         $$(this.ids.buttonSave).disable();
      }

      async formIsValid() {
         var Form = $$(this.ids.form);

         Form?.clearValidation();

         // if it doesn't pass the basic form validation, return:
         if (!Form.validate()) {
            $$(this.ids.buttonSave)?.enable();
            return false;
         }
         return true;
      }

      async formValues() {
         // let L = this.L();

         var Form = $$(this.ids.form);
         let values = Form.getValues();

         // values.credentials = this.UI_Credentials.getValues();

         return values;
      }
   };
}