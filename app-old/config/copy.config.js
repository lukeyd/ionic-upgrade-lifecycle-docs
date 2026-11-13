// app-old copy override: ships the prebuilt Ionic 3 stylesheet because the
// Ionic SCSS theme cannot be compiled with Dart Sass (see sass.config.js).
// ionic.css references its fonts at ../fonts/ (relative to build/), so the
// fonts are also copied to {{WWW}}/fonts in addition to the default
// {{WWW}}/assets/fonts location.
var defaults = require('@ionic/app-scripts/config/copy.config.js');

module.exports = Object.assign({}, defaults, {
  copyIonicCss: {
    src: ['{{ROOT}}/node_modules/ionic-angular/css/ionic.css'],
    dest: '{{BUILD}}'
  },
  copyIonicCssFonts: {
    src: ['{{ROOT}}/node_modules/ionicons/dist/fonts/**/*', '{{ROOT}}/node_modules/ionic-angular/fonts/**/*'],
    dest: '{{WWW}}/fonts'
  }
});
