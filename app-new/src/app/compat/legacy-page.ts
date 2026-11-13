import { AfterViewInit, Directive, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ViewDidEnter, ViewDidLeave, ViewWillEnter, ViewWillLeave } from '@ionic/angular/standalone';
import { log } from '../shared/lifecycle-log';

/**
 * Legacy (Ionic 3 style) lifecycle shim for Ionic 8 pages.
 *
 * Maps the removed Ionic 3 hooks onto their closest modern equivalents:
 *   ionViewWillLoad    <- ngOnInit
 *   ionViewDidLoad     <- ngAfterViewInit
 *   ionViewWillUnload  <- ngOnDestroy
 *   ionViewCanLeave    <- Router canDeactivate guard (see legacyCanLeave in legacy-guards.ts)
 *   ionViewCanEnter    <- Router canActivate guard (see legacyCanEnter in legacy-guards.ts)
 *
 * Convention for ionViewCanEnter: because the Router's canActivate guard runs BEFORE the
 * component instance exists, it must be declared as a STATIC method on the page class:
 *
 *   static ionViewCanEnter(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Promise<boolean>
 *
 * and registered on the route via `canActivate: [legacyCanEnter(MyPage)]`.
 *
 * ionViewWillEnter/DidEnter/WillLeave/DidLeave are still native Ionic 8 hooks and are simply re-logged
 * here with source 'ionic-compat'. Subclasses that override any hook should call super.
 */
@Directive()
export abstract class LegacyPage
  implements OnInit, AfterViewInit, OnDestroy, ViewWillEnter, ViewDidEnter, ViewWillLeave, ViewDidLeave
{
  static ionViewCanEnter?(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Promise<boolean>;

  constructor(protected readonly pageName: string) {}

  // ---- Angular -> legacy mapping ----
  ngOnInit(): void { this.ionViewWillLoad(); }
  ngAfterViewInit(): void { this.ionViewDidLoad(); }
  ngOnDestroy(): void { this.ionViewWillUnload(); }

  // ---- legacy hooks (default implementations) ----
  ionViewWillLoad(): void { log(this.pageName, 'ionic-compat', 'ionViewWillLoad'); }
  ionViewDidLoad(): void { log(this.pageName, 'ionic-compat', 'ionViewDidLoad'); }
  ionViewWillUnload(): void { log(this.pageName, 'ionic-compat', 'ionViewWillUnload'); }

  ionViewCanLeave(): boolean | Promise<boolean> {
    log(this.pageName, 'ionic-compat', 'ionViewCanLeave');
    return new Promise<boolean>((resolve) =>
      setTimeout(() => { log(this.pageName, 'ionic-compat', 'ionViewCanLeave', 'resolved(true)'); resolve(true); }, 0),
    );
  }

  // ---- live Ionic 8 hooks, re-emitted with the compat source ----
  ionViewWillEnter(): void { log(this.pageName, 'ionic-compat', 'ionViewWillEnter'); }
  ionViewDidEnter(): void { log(this.pageName, 'ionic-compat', 'ionViewDidEnter'); }
  ionViewWillLeave(): void { log(this.pageName, 'ionic-compat', 'ionViewWillLeave'); }
  ionViewDidLeave(): void { log(this.pageName, 'ionic-compat', 'ionViewDidLeave'); }
}
