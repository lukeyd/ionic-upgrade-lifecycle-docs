import {
  AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, Component, DoCheck, OnChanges, OnDestroy,
  OnInit, SimpleChanges, inject,
} from '@angular/core';
import {
  IonButton, IonContent, IonHeader, IonTitle, IonToolbar, NavController, ViewDidEnter, ViewDidLeave, ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular/standalone';
import { LogRenderDirective } from '../shared/log-render.directive';
import { log } from '../shared/lifecycle-log';

const PAGE = 'Home';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, LogRenderDirective],
  template: `
<ion-header><ion-toolbar><ion-title>Home (Ionic 8)</ion-title></ion-toolbar></ion-header>
<ion-content class="ion-padding" logRender="Home">{{ trace('template-evaluated') }}
  <p>Ionic 8.4.3 / Angular 20.1.3</p>
  <ion-button data-test="go-detail" (click)="go()">Go to Detail</ion-button>
</ion-content>
`,
})
export class HomePage
  implements OnChanges, OnInit, DoCheck, AfterContentInit, AfterContentChecked, AfterViewInit, AfterViewChecked,
    OnDestroy, ViewWillEnter, ViewDidEnter, ViewWillLeave, ViewDidLeave
{
  private readonly nav = inject(NavController);

  constructor() { log(PAGE, 'angular', 'constructor'); }

  // Angular hooks
  ngOnChanges(_c: SimpleChanges): void { log(PAGE, 'angular', 'ngOnChanges'); }
  ngOnInit(): void { log(PAGE, 'angular', 'ngOnInit'); }
  ngDoCheck(): void { log(PAGE, 'angular', 'ngDoCheck'); }
  ngAfterContentInit(): void { log(PAGE, 'angular', 'ngAfterContentInit'); }
  ngAfterContentChecked(): void { log(PAGE, 'angular', 'ngAfterContentChecked'); }
  ngAfterViewInit(): void { log(PAGE, 'angular', 'ngAfterViewInit'); }
  ngAfterViewChecked(): void { log(PAGE, 'angular', 'ngAfterViewChecked'); }
  ngOnDestroy(): void { log(PAGE, 'angular', 'ngOnDestroy'); }

  // Ionic 8 hooks (the four that still exist)
  ionViewWillEnter(): void { log(PAGE, 'ionic', 'ionViewWillEnter'); }
  ionViewDidEnter(): void { log(PAGE, 'ionic', 'ionViewDidEnter'); }
  ionViewWillLeave(): void { log(PAGE, 'ionic', 'ionViewWillLeave'); }
  ionViewDidLeave(): void { log(PAGE, 'ionic', 'ionViewDidLeave'); }

  // Ionic 3 hooks removed in Ionic 4+: kept so the report can show they never fire.
  ionViewCanEnter(): boolean { log(PAGE, 'ionic', 'ionViewCanEnter'); return true; }
  ionViewWillLoad(): void { log(PAGE, 'ionic', 'ionViewWillLoad'); }
  ionViewDidLoad(): void { log(PAGE, 'ionic', 'ionViewDidLoad'); }
  ionViewCanLeave(): boolean { log(PAGE, 'ionic', 'ionViewCanLeave'); return true; }
  ionViewWillUnload(): void { log(PAGE, 'ionic', 'ionViewWillUnload'); }

  /** Called from the template; logs each time the template is evaluated by change detection. */
  trace(label: string): string { log(PAGE, 'cd', label); return ''; }

  go(): void {
    log(PAGE, 'ionic', 'nav.navigateForward');
    this.nav.navigateForward('/detail');
  }
}
