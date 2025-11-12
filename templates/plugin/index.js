// NOTE: our webpack build process will ignore this file and
// create service and web compiled files instead.
// Service and web directories will be added as optional commands later
export default function register(API) {
   // TODO: Add service and web registration when those directories are created
   switch (API.platform) {
      case "service":
         // service(API);
         break;

      case "web":
         // web(API);
         break;
   }
}
