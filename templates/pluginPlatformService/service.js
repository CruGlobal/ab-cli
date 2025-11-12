import <%= fnObjectName %> from "./service/<%= fnObjectName %>.js";

export default function registerService(PluginAPI) {
   return [
      <%= fnObjectName %>(PluginAPI)
   ];
}

