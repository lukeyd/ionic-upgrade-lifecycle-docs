import {
  Component, OnChanges, OnInit, DoCheck, AfterContentInit, AfterContentChecked,
  AfterViewInit, AfterViewChecked, OnDestroy, SimpleChanges
} from '@angular/core';
import { NavController, ViewController } from 'ionic-angular';
import { DetailPage } from '../detail/detail';
import { log } from '../../shared/lifecycle-log';

var PAGE = 'Home';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnChanges, OnInit, DoCheck, AfterContentInit, AfterContentChecked,
  AfterViewInit, AfterViewChecked, OnDestroy {

  constructor(public navCtrl: NavController, viewCtrl: ViewController) {
    log(PAGE, 'angular', 'constructor');
    var rr: any = (viewCtrl as any).readReady;
    var wr: any = (viewCtrl as any).writeReady;
    if (rr && typeof rr.subscribe === 'function') {
      rr.subscribe(function () { log(PAGE, 'render', 'viewCtrl.readReady'); });
    }
    if (wr && typeof wr.subscribe === 'function') {
      wr.subscribe(function () { log(PAGE, 'render', 'viewCtrl.writeReady'); });
    }
  }

  // ---- Angular hooks ----
  ngOnChanges(changes: SimpleChanges): void { log(PAGE, 'angular', 'ngOnChanges'); }
  ngOnInit(): void { log(PAGE, 'angular', 'ngOnInit'); }
  ngDoCheck(): void { log(PAGE, 'angular', 'ngDoCheck'); }
  ngAfterContentInit(): void { log(PAGE, 'angular', 'ngAfterContentInit'); }
  ngAfterContentChecked(): void { log(PAGE, 'angular', 'ngAfterContentChecked'); }
  ngAfterViewInit(): void { log(PAGE, 'angular', 'ngAfterViewInit'); }
  ngAfterViewChecked(): void { log(PAGE, 'angular', 'ngAfterViewChecked'); }
  ngOnDestroy(): void { log(PAGE, 'angular', 'ngOnDestroy'); }

  // ---- Ionic 3 hooks ----
  ionViewCanEnter(): Promise<boolean> {
    log(PAGE, 'ionic', 'ionViewCanEnter');
    return new Promise<boolean>(function (resolve) {
      setTimeout(function () {
        log(PAGE, 'ionic', 'ionViewCanEnter', 'resolved(true)');
        resolve(true);
      }, 0);
    });
  }
  ionViewWillLoad(): void { log(PAGE, 'ionic', 'ionViewWillLoad'); }
  ionViewDidLoad(): void { log(PAGE, 'ionic', 'ionViewDidLoad'); }
  ionViewWillEnter(): void { log(PAGE, 'ionic', 'ionViewWillEnter'); }
  ionViewDidEnter(): void { log(PAGE, 'ionic', 'ionViewDidEnter'); }
  ionViewWillLeave(): void { log(PAGE, 'ionic', 'ionViewWillLeave'); }
  ionViewDidLeave(): void { log(PAGE, 'ionic', 'ionViewDidLeave'); }
  ionViewCanLeave(): Promise<boolean> {
    log(PAGE, 'ionic', 'ionViewCanLeave');
    return new Promise<boolean>(function (resolve) {
      setTimeout(function () {
        log(PAGE, 'ionic', 'ionViewCanLeave', 'resolved(true)');
        resolve(true);
      }, 0);
    });
  }
  ionViewWillUnload(): void { log(PAGE, 'ionic', 'ionViewWillUnload'); }

  // ---- change-detection probe (called from the template) ----
  trace(label: string): string {
    log(PAGE, 'cd', label);
    return '';
  }

  go(): void {
    log(PAGE, 'ionic', 'nav.push');
    this.navCtrl.push(DetailPage);
  }
}
