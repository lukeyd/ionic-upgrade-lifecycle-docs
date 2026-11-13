import { AfterViewInit, Directive, Input, OnInit, afterEveryRender, afterNextRender } from '@angular/core';
import { log } from './lifecycle-log';

/** Placed on each page's <ion-content>; emits source 'render' entries for that page. */
@Directive({ selector: '[logRender]', standalone: true })
export class LogRenderDirective implements OnInit, AfterViewInit {
  @Input('logRender') page = '';

  constructor() {
    // Registered in the injection context; afterNextRender fires once after the
    // next CD-driven render, afterEveryRender after each render of this view's host.
    afterNextRender(() => log(this.page, 'render', 'afterNextRender'));
    afterEveryRender(() => log(this.page, 'render', 'afterEveryRender'));
  }

  ngOnInit(): void { log(this.page, 'render', 'directive:ngOnInit'); }
  ngAfterViewInit(): void { log(this.page, 'render', 'directive:ngAfterViewInit'); }
}
