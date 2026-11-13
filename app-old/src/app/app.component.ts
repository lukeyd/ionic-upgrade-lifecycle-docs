import { Component, ApplicationRef } from '@angular/core';
import { App, ViewController } from 'ionic-angular';

import { HomePage } from '../pages/home/home';
import { log } from '../shared/lifecycle-log';

@Component({
  template: '<ion-nav [root]="rootPage"></ion-nav>'
})
export class MyApp {
  rootPage: any = HomePage;

  constructor(app: App, appRef: ApplicationRef) {
    log('App', 'angular', 'AppComponent.constructor');

    // Angular 5's ApplicationRef is abstract; patch the instance's tick().
    var origTick = appRef.tick;
    var inTick = false;
    (appRef as any).tick = function () {
      if (!inTick) {
        inTick = true;
        try {
          log('App', 'cd', 'AppRef.tick');
        } finally {
          inTick = false;
        }
      }
      return origTick.apply(appRef, arguments);
    };

    var viewName = function (vc: ViewController): string {
      return vc && vc.name ? vc.name : (vc && vc.component && vc.component.name) || '?';
    };
    app.viewDidLoad.subscribe(function (vc: ViewController) { log('App', 'ionic-app', 'app.viewDidLoad', viewName(vc)); });
    app.viewWillEnter.subscribe(function (vc: ViewController) { log('App', 'ionic-app', 'app.viewWillEnter', viewName(vc)); });
    app.viewDidEnter.subscribe(function (vc: ViewController) { log('App', 'ionic-app', 'app.viewDidEnter', viewName(vc)); });
    app.viewWillLeave.subscribe(function (vc: ViewController) { log('App', 'ionic-app', 'app.viewWillLeave', viewName(vc)); });
    app.viewDidLeave.subscribe(function (vc: ViewController) { log('App', 'ionic-app', 'app.viewDidLeave', viewName(vc)); });
    app.viewWillUnload.subscribe(function (vc: ViewController) { log('App', 'ionic-app', 'app.viewWillUnload', viewName(vc)); });
  }
}
