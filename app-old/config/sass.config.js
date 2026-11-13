// app-old sass override (fallback "b" from the build plan).
//
// node-sass cannot be built on arm64 macOS, so package.json aliases it to Dart
// Sass (overrides: node-sass -> npm:sass). Dart Sass rejects the multi-line
// string literals in node_modules/ionic-angular/themes/ionic.functions.scss,
// so we skip compiling the Ionic theme entirely and instead copy the prebuilt
// node_modules/ionic-angular/css/ionic.css (see copy.config.js and index.html).
// Only the app's own .scss (src/app/app.scss, page .scss siblings) is compiled.
var defaults = require('@ionic/app-scripts/config/sass.config.js');

module.exports = Object.assign({}, defaults, {
  excludeModules: defaults.excludeModules.concat(['ionic-angular', 'ionicons']),
  variableSassFiles: []
});
