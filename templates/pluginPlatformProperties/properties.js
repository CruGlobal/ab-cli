import <%= fnObjectName %> from "./properties/<%= fnObjectName %>.js";

export default function registerProperties(PluginAPI) {
   return [
      <%= fnObjectName %>(PluginAPI)
   ];
}

