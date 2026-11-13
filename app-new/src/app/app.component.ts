import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { log } from './shared/lifecycle-log';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app>
  <ion-router-outlet
    (ionNavWillChange)="onNav('ionNavWillChange')"
    (ionNavDidChange)="onNav('ionNavDidChange')"
  ></ion-router-outlet>
</ion-app>`,
})
export class AppComponent {
  constructor() { log('App', 'angular', 'AppComponent.constructor'); }
  onNav(name: string): void { log('App', 'ionic-app', name); }
}
