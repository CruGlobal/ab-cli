// <%= fnObjectName %> Editor
// An Editor wrapper for the ABView Component.
// The Editor is displayed in the ABDesigner as a view is worked on.
// The Editor allows a widget to be moved and placed on the canvas.
//
export default function <%= fnObjectName %>Editor({ ABViewEditorPlugin }) {
   return class AB<%= objectNamePascal %>Editor extends ABViewEditorPlugin {
      constructor(view, base = "interface_editor_<%= objectNamePascal.toLowerCase() %>", ids = {}) {
         // view: {ABView} The ABView instance this editor is for
         // base: {string} unique base id reference
         // ids: {hash}  { key => '' }
         // this is provided by the Sub Class and has the keys
         // unique to the Sub Class' interface elements.

         super(view, base, ids);
      }

      /**
       * @method getPluginKey
       * return the plugin key for this editor.
       * @return {string} plugin key
       */
      static getPluginKey() {
         return "<%= pluginKey %>";
      }

      /**
       * @method getPluginType
       * return the plugin type for this editor.
       * plugin types are how our ClassManager knows how to store 
       * the plugin.
       * @return {string} plugin type
       */
      static getPluginType() {
         return "editor-view";
         // editor-view : will display in the editor panel of the ABDesigner
      }

      /**
       * @method ui()
       * Return the Webix UI definition for this editor.
       * @return {object} Webix UI definition
       */
      ui() {
         // Default implementation uses the component's UI
         // Sub classes can override this to provide custom editor UI
         return super.ui();
      }

      /**
       * @method init()
       * Initialize the editor with the ABFactory instance.
       * @param {ABFactory} AB
       */
      async init(AB) {
         await super.init(AB);

         //
         // Add any custom initialization here
         //
      }

      /**
       * @method onShow()
       * Called when the editor is shown.
       */
      onShow() {
         super.onShow();
         //
         // Add any custom onShow logic here
         //
      }

      /**
       * @method onHide()
       * Called when the editor is hidden.
       */
      onHide() {
         super.onHide();

         //
         // Add any custom onHide logic here
         //
      }

      /**
       * @method detatch()
       * Detach the editor component.
       */
      detatch() {
         super.detatch();

         //
         // Add any custom cleanup logic here
         //
      }
   };
}
