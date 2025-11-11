import <%= fnObjectName %> from "./web/<%= fnObjectName %>.js";

export default function registerWeb(PluginAPI) {
   return [
      <%= fnObjectName %>(PluginAPI)
   ];
}

