import {
  AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, Component, DoCheck, OnChanges, OnDestroy,
  OnInit, SimpleChanges, inject,
} from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar, NavController } from '@ionic/angular/standalone';
import { LegacyPage } from '../../compat/legacy-page';
import { LogRenderDirective } from '../../shared/log-render.directive';
import { log } from '../../shared/lifecycle-log';

const PAGE = 'Home';

@Component({
  selector: 'app-home-compat',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, LogRenderDirective],
  template: `
<ion-header><ion-toolbar><ion-title>Home (compat)</ion-title></ion-toolbar></ion-header>
<ion-content class="ion-padding" logRender="Home">{{ trace('template-evaluated') }}
  <p>Ionic 8.4.3 / Angular 20.1.3 (legacy lifecycle shim)</p>
  <ion-button data-test="go-detail" (click)="go()">Go to Detail</ion-button>
</ion-content>
`,
})
export class HomeCompatPage extends LegacyPage
  implements OnChanges, OnInit, DoCheck, AfterContentInit, AfterContentChecked, AfterViewInit, AfterViewChecked, OnDestroy
{
  private readonly nav = inject(NavController);

  /** Static: runs from the canActivate guard before any instance exists. */
  static override ionViewCanEnter(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Promise<boolean> {
    log(PAGE, 'ionic-compat', 'ionViewCanEnter');
    return new Promise<boolean>((resolve) =>
      setTimeout(() => { log(PAGE, 'ionic-compat', 'ionViewCanEnter', 'resolved(true)'); resolve(true); }, 0),
    );
  }

  constructor() {
    super(PAGE);
    log(PAGE, 'angular', 'constructor');
  }

  // Angular hooks (logged, then delegated to the shim where it maps them)
  ngOnChanges(_c: SimpleChanges): void { log(PAGE, 'angular', 'ngOnChanges'); }
  override ngOnInit(): void { log(PAGE, 'angular', 'ngOnInit'); super.ngOnInit(); }
  ngDoCheck(): void { log(PAGE, 'angular', 'ngDoCheck'); }
  ngAfterContentInit(): void { log(PAGE, 'angular', 'ngAfterContentInit'); }
  ngAfterContentChecked(): void { log(PAGE, 'angular', 'ngAfterContentChecked'); }
  override ngAfterViewInit(): void { log(PAGE, 'angular', 'ngAfterViewInit'); super.ngAfterViewInit(); }
  ngAfterViewChecked(): void { log(PAGE, 'angular', 'ngAfterViewChecked'); }
  override ngOnDestroy(): void { log(PAGE, 'angular', 'ngOnDestroy'); super.ngOnDestroy(); }

  override ionViewCanLeave(): Promise<boolean> {
    log(PAGE, 'ionic-compat', 'ionViewCanLeave');
    return new Promise<boolean>((resolve) =>
      setTimeout(() => { log(PAGE, 'ionic-compat', 'ionViewCanLeave', 'resolved(true)'); resolve(true); }, 0),
    );
  }

  /** Called from the template; logs each time the template is evaluated by change detection. */
  trace(label: string): string { log(PAGE, 'cd', label); return ''; }

  go(): void {
    log(PAGE, 'ionic', 'nav.navigateForward');
    this.nav.navigateForward('/detail');
  }
}
